-- Vários serviços por atendimento.
--
-- A cliente pode combinar alongamento com esmaltação numa sessão só. Com um
-- serviço por agendamento, ela teria que marcar dois seguidos — e aí a
-- arrumação do primeiro entraria no meio, criando um intervalo que não existe.
--
-- Refeito agora porque o banco ainda não tem agendamento real. Depois, cada
-- mudança dessas exigiria migrar dados de clientes.

-- ---------------------------------------------------------------------------
-- As funções antigas recebiam um serviço só. Removidas em vez de sobrecarregadas
-- para não sobrar um caminho antigo que alguém chame por engano.
-- ---------------------------------------------------------------------------
drop function if exists available_slots(uuid, date);
drop function if exists book_appointment(uuid, timestamptz, text, text);
drop function if exists book_appointment_as_owner(uuid, timestamptz, text, text, boolean);
drop function if exists slot_warnings(uuid, timestamptz);
drop function if exists appointment_details(uuid);

-- ---------------------------------------------------------------------------
-- Serviços de um atendimento
--
-- Cada linha congela preço, desconto, duração e arrumação do momento da
-- marcação — mesmo motivo do preço congelado no agendamento: reajustar a
-- tabela não pode reescrever o que já foi combinado.
-- ---------------------------------------------------------------------------
create table if not exists appointment_services (
  appointment_id   uuid not null references appointments(id) on delete cascade,
  service_id       uuid not null references services(id) on delete restrict,
  price_cents      integer not null check (price_cents >= 0),
  discount_cents   integer not null default 0 check (discount_cents >= 0),
  duration_minutes integer not null check (duration_minutes > 0),
  buffer_minutes   integer not null default 0 check (buffer_minutes >= 0),

  primary key (appointment_id, service_id)
);

alter table appointment_services enable row level security;

create policy "dona gerencia servicos do agendamento"
  on appointment_services for all to authenticated
  using (is_owner()) with check (is_owner());

-- `appointments.service_id` some: quem responde "quais serviços" agora é a
-- tabela acima. price_cents e discount_cents continuam no agendamento como
-- total, que é o que o faturamento soma.
alter table appointments drop column if exists service_id;

-- ---------------------------------------------------------------------------
-- Duração e arrumação de um conjunto de serviços
--
-- Duração soma: alongamento de 2h com esmaltação de 1h30 são 3h30 de cadeira.
--
-- Arrumação é o MAIOR, não a soma: a estação é limpa uma vez no fim, e o
-- trabalho é o do procedimento mais pesado. Somar reservaria um tempo que
-- não é usado e comeria agenda à toa.
-- ---------------------------------------------------------------------------
create or replace function services_extent(p_service_ids uuid[])
returns table (duration_minutes integer, buffer_minutes integer, found integer)
language sql
stable
security definer
set search_path = public
as $$
  select
    coalesce(sum(sv.duration_minutes), 0)::integer,
    coalesce(max(sv.buffer_minutes), 0)::integer,
    count(*)::integer
  from services sv
  where sv.id = any(p_service_ids) and sv.active;
$$;

-- ---------------------------------------------------------------------------
-- Horários livres para o conjunto escolhido
-- ---------------------------------------------------------------------------
create or replace function available_slots(p_service_ids uuid[], p_date date)
returns table (slot timestamptz)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_tz text; v_notice integer; v_window integer;
  v_duration integer; v_buffer integer; v_found integer;
  v_pro uuid; v_opens time; v_closes time; v_has_exception boolean;
  v_step integer := 15; v_occupies interval;
begin
  if p_service_ids is null or array_length(p_service_ids, 1) is null then
    return;
  end if;

  select s.timezone, s.minimum_notice_hours, s.booking_window_days
    into v_tz, v_notice, v_window from settings s;

  select e.duration_minutes, e.buffer_minutes, e.found
    into v_duration, v_buffer, v_found
  from services_extent(p_service_ids) e;

  -- Todos os escolhidos precisam existir e estar ativos. Ignorar um inativo em
  -- silêncio daria um horário calculado para menos serviços do que a cliente
  -- pediu.
  if v_found <> array_length(p_service_ids, 1) then
    return;
  end if;

  select p.id into v_pro from professionals p
  where p.active order by p.created_at limit 1;
  if v_pro is null then return; end if;

  if p_date > ((now() at time zone v_tz)::date + v_window) then return; end if;

  select true, e.opens_at, e.closes_at into v_has_exception, v_opens, v_closes
  from schedule_exceptions e
  where e.professional_id = v_pro and e.date = p_date;

  if v_has_exception then
    if v_opens is null then return; end if;
  else
    select b.opens_at, b.closes_at into v_opens, v_closes
    from business_hours b
    where b.professional_id = v_pro and b.weekday = extract(dow from p_date);
    if v_opens is null then return; end if;
  end if;

  v_occupies := make_interval(mins => v_duration + v_buffer);

  return query
  with candidates as (
    select generate_series(
      (p_date + v_opens) at time zone v_tz,
      (p_date + v_closes) at time zone v_tz,
      make_interval(mins => v_step)
    ) as starts_at
  )
  select c.starts_at from candidates c
  where c.starts_at + v_occupies <= (p_date + v_closes) at time zone v_tz
    and c.starts_at >= now() + make_interval(hours => v_notice)
    and not exists (
      select 1 from appointments a
      where a.professional_id = v_pro
        and a.status in ('pendente', 'confirmado')
        and tstzrange(a.starts_at, a.blocked_until)
            && tstzrange(c.starts_at, c.starts_at + v_occupies)
    )
  order by c.starts_at;
end $$;

-- ---------------------------------------------------------------------------
-- Criação do agendamento
--
-- Compartilhada pelos dois caminhos (cliente e dona) para que a forma de
-- gravar seja uma só. Não valida nada: quem chama já decidiu.
-- ---------------------------------------------------------------------------
create or replace function create_appointment(
  p_service_ids uuid[],
  p_starts_at   timestamptz,
  p_name        text,
  p_phone       text,
  p_status      text
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_pro uuid; v_duration integer; v_buffer integer; v_found integer;
  v_total integer; v_discount integer; v_phone text;
  v_client uuid; v_appointment uuid; v_date date; v_tz text;
begin
  if coalesce(trim(p_name), '') = '' then
    raise exception 'Informe o nome.';
  end if;

  -- Só dígitos: "(11) 99999-0000" e "11999990000" são a mesma pessoa.
  v_phone := regexp_replace(coalesce(p_phone, ''), '\D', '', 'g');
  if length(v_phone) < 10 then
    raise exception 'Informe um telefone com DDD.';
  end if;

  select s.timezone into v_tz from settings s;
  v_date := (p_starts_at at time zone v_tz)::date;

  select e.duration_minutes, e.buffer_minutes, e.found
    into v_duration, v_buffer, v_found
  from services_extent(p_service_ids) e;

  if v_found <> coalesce(array_length(p_service_ids, 1), 0) then
    raise exception 'Algum serviço escolhido não está mais disponível.';
  end if;

  -- Total calculado aqui, nunca recebido de quem chama.
  select coalesce(sum(pr.price_cents), 0), coalesce(sum(pr.discount_cents), 0)
    into v_total, v_discount
  from unnest(p_service_ids) as sid
  cross join lateral service_price_on(sid, v_date) pr;

  select p.id into v_pro from professionals p
  where p.active order by p.created_at limit 1;

  insert into clients (name, phone) values (trim(p_name), v_phone)
  on conflict (phone) do update set name = excluded.name
  returning id into v_client;

  insert into appointments (
    client_id, professional_id, starts_at, ends_at, blocked_until,
    status, price_cents, discount_cents
  ) values (
    v_client, v_pro, p_starts_at,
    p_starts_at + make_interval(mins => v_duration),
    p_starts_at + make_interval(mins => v_duration + v_buffer),
    p_status, v_total, v_discount
  ) returning id into v_appointment;

  insert into appointment_services (
    appointment_id, service_id, price_cents, discount_cents,
    duration_minutes, buffer_minutes
  )
  select v_appointment, sv.id, pr.price_cents, pr.discount_cents,
         sv.duration_minutes, sv.buffer_minutes
  from services sv
  cross join lateral service_price_on(sv.id, v_date) pr
  where sv.id = any(p_service_ids);

  return v_appointment;
end $$;

revoke execute on function create_appointment(uuid[], timestamptz, text, text, text)
  from anon, public, authenticated;

-- ---------------------------------------------------------------------------
-- Caminho da cliente
-- ---------------------------------------------------------------------------
create or replace function book_appointment(
  p_service_ids uuid[],
  p_starts_at   timestamptz,
  p_name        text,
  p_phone       text
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_tz text; v_date date; v_require_appr boolean;
begin
  select s.timezone, s.require_approval into v_tz, v_require_appr from settings s;
  v_date := (p_starts_at at time zone v_tz)::date;

  -- A validação pergunta à própria listagem, em vez de reconferir por conta
  -- própria: assim não há como o que é aceito divergir do que foi mostrado.
  if not exists (
    select 1 from available_slots(p_service_ids, v_date) s where s.slot = p_starts_at
  ) then
    raise exception 'Esse horário não está mais disponível.';
  end if;

  return create_appointment(
    p_service_ids, p_starts_at, p_name, p_phone,
    case when v_require_appr then 'pendente' else 'confirmado' end
  );
end $$;

-- ---------------------------------------------------------------------------
-- Caminho da dona
-- ---------------------------------------------------------------------------
create or replace function book_appointment_as_owner(
  p_service_ids uuid[],
  p_starts_at   timestamptz,
  p_name        text,
  p_phone       text,
  p_force       boolean default false
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_tz text; v_date date;
begin
  if not is_owner() then
    raise exception 'Apenas a administradora pode agendar por uma cliente.';
  end if;

  select s.timezone into v_tz from settings s;
  v_date := (p_starts_at at time zone v_tz)::date;

  if not p_force and not exists (
    select 1 from available_slots(p_service_ids, v_date) s where s.slot = p_starts_at
  ) then
    raise exception 'Esse horário não está disponível. Use a opção de escolher outro horário para forçar.';
  end if;

  -- Nasce confirmado: ela acabou de combinar com a cliente, e deixar pendente
  -- a obrigaria a aprovar o próprio lançamento.
  return create_appointment(p_service_ids, p_starts_at, p_name, p_phone, 'confirmado');
end $$;

-- ---------------------------------------------------------------------------
-- Avisos do horário
-- ---------------------------------------------------------------------------
create or replace function slot_warnings(p_service_ids uuid[], p_starts_at timestamptz)
returns text[]
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_tz text; v_notice integer; v_window integer;
  v_duration integer; v_buffer integer; v_found integer;
  v_pro uuid; v_opens time; v_closes time; v_has_exception boolean;
  v_date date; v_occupies interval; v_out text[] := '{}';
begin
  select s.timezone, s.minimum_notice_hours, s.booking_window_days
    into v_tz, v_notice, v_window from settings s;

  select e.duration_minutes, e.buffer_minutes, e.found
    into v_duration, v_buffer, v_found
  from services_extent(p_service_ids) e;

  if v_found <> coalesce(array_length(p_service_ids, 1), 0) then
    return array['Algum serviço escolhido está inativo'];
  end if;

  v_occupies := make_interval(mins => v_duration + v_buffer);
  v_date := (p_starts_at at time zone v_tz)::date;

  select p.id into v_pro from professionals p
  where p.active order by p.created_at limit 1;

  select true, e.opens_at, e.closes_at into v_has_exception, v_opens, v_closes
  from schedule_exceptions e
  where e.professional_id = v_pro and e.date = v_date;

  if v_has_exception and v_opens is null then
    v_out := array_append(v_out, 'Dia marcado como sem atendimento');
  elsif not coalesce(v_has_exception, false) then
    select b.opens_at, b.closes_at into v_opens, v_closes
    from business_hours b
    where b.professional_id = v_pro and b.weekday = extract(dow from v_date);
    if v_opens is null then
      v_out := array_append(v_out, 'Dia fora do seu atendimento');
    end if;
  end if;

  if v_opens is not null then
    if p_starts_at < (v_date + v_opens) at time zone v_tz then
      v_out := array_append(v_out, 'Antes do horário de abertura');
    end if;
    if p_starts_at + v_occupies > (v_date + v_closes) at time zone v_tz then
      v_out := array_append(v_out, 'Passa do horário de fechamento, contando a arrumação');
    end if;
  end if;

  if p_starts_at < now() then
    v_out := array_append(v_out, 'Horário que já passou');
  elsif p_starts_at < now() + make_interval(hours => v_notice) then
    v_out := array_append(v_out, format('Menos de %sh de antecedência', v_notice));
  end if;

  if v_date > ((now() at time zone v_tz)::date + v_window) then
    v_out := array_append(v_out, 'Além da janela de agendamento');
  end if;

  if exists (
    select 1 from appointments a
    where a.professional_id = v_pro and a.status in ('pendente', 'confirmado')
      and tstzrange(a.starts_at, a.blocked_until)
          && tstzrange(p_starts_at, p_starts_at + v_occupies)
  ) then
    v_out := array_append(v_out, 'Choca com outro atendimento — o banco não deixa nem forçando');
  end if;

  return v_out;
end $$;

-- ---------------------------------------------------------------------------
-- Consulta do próprio agendamento
-- ---------------------------------------------------------------------------
create or replace function appointment_details(p_id uuid)
returns table (
  id           uuid,
  starts_at    timestamptz,
  ends_at      timestamptz,
  status       text,
  services     text,
  price_cents  integer
)
language sql
stable
security definer
set search_path = public
as $$
  select
    a.id, a.starts_at, a.ends_at, a.status,
    (select string_agg(sv.name, ', ' order by sv.sort_order)
     from appointment_services aps
     join services sv on sv.id = aps.service_id
     where aps.appointment_id = a.id),
    a.price_cents
  from appointments a
  where a.id = p_id;
$$;

revoke execute on function slot_warnings(uuid[], timestamptz) from anon, public;
revoke execute on function book_appointment_as_owner(uuid[], timestamptz, text, text, boolean)
  from anon, public;

grant execute on function services_extent(uuid[]) to anon, authenticated;
grant execute on function available_slots(uuid[], date) to anon, authenticated;
grant execute on function book_appointment(uuid[], timestamptz, text, text) to anon, authenticated;
grant execute on function appointment_details(uuid) to anon, authenticated;
grant execute on function slot_warnings(uuid[], timestamptz) to authenticated;
grant execute on function book_appointment_as_owner(uuid[], timestamptz, text, text, boolean) to authenticated;
