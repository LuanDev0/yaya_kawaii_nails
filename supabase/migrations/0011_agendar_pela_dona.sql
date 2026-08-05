-- Agendamento feito pela dona em nome da cliente.
--
-- Muita cliente não vai abrir link nenhum: manda mensagem e pronto. Sem isto,
-- a dona manteria uma agenda de papel em paralelo — e duas agendas viram duas
-- agendas erradas.
--
-- Por padrão vale a mesma regra da cliente. Com `p_force`, ela escolhe
-- qualquer horário: fora do expediente, em cima da hora, além da janela.
-- O que nem forçando passa é sobreposição — a constraint do banco recusa, e
-- com razão: ela é uma pessoa só.

-- ---------------------------------------------------------------------------
-- Preço numa data, já com a promoção que estiver valendo
--
-- Extraído para função própria porque agora dois caminhos criam agendamento.
-- Duas cópias da regra seriam duas chances de o valor cobrado deixar de bater
-- com o registrado.
-- ---------------------------------------------------------------------------
create or replace function service_price_on(p_service_id uuid, p_date date)
returns table (price_cents integer, discount_cents integer)
language sql
stable
security definer
set search_path = public
as $$
  select
    sv.price_cents - d.value,
    d.value
  from services sv
  cross join lateral (
    select case
      when sv.discount_kind is null or sv.discount_value is null then 0
      when sv.discount_starts_on is not null and p_date < sv.discount_starts_on then 0
      when sv.discount_ends_on is not null and p_date > sv.discount_ends_on then 0
      when sv.discount_kind = 'valor' then least(sv.discount_value, sv.price_cents)
      else least(round(sv.price_cents * sv.discount_value / 100.0)::integer, sv.price_cents)
    end as value
  ) d
  where sv.id = p_service_id;
$$;

-- ---------------------------------------------------------------------------
-- O que está sendo furado num horário
--
-- Serve para a tela avisar antes de confirmar, em vez de só recusar depois.
-- Lista vazia significa horário limpo.
-- ---------------------------------------------------------------------------
create or replace function slot_warnings(p_service_id uuid, p_starts_at timestamptz)
returns text[]
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_tz text; v_notice integer; v_window integer;
  v_duration integer; v_buffer integer; v_pro uuid;
  v_opens time; v_closes time; v_has_exception boolean;
  v_date date; v_occupies interval;
  -- array_append em vez de `v_out || 'texto'`: com o operador, o Postgres fica
  -- em dúvida se o texto é um item ou uma lista inteira, tenta interpretá-lo
  -- como lista e quebra com "malformed array literal". E só quebra quando um
  -- aviso é acionado, então passa pela criação da função sem reclamar.
  v_out text[] := '{}';
begin
  select s.timezone, s.minimum_notice_hours, s.booking_window_days
    into v_tz, v_notice, v_window from settings s;

  select sv.duration_minutes, sv.buffer_minutes into v_duration, v_buffer
  from services sv where sv.id = p_service_id and sv.active;

  if v_duration is null then
    return array['Serviço inativo ou inexistente'];
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

  -- Este é o único que nem forçando passa: a constraint do banco recusa.
  if exists (
    select 1 from appointments a
    where a.professional_id = v_pro
      and a.status in ('pendente', 'confirmado')
      and tstzrange(a.starts_at, a.blocked_until)
          && tstzrange(p_starts_at, p_starts_at + v_occupies)
  ) then
    v_out := array_append(v_out, 'Choca com outro atendimento — isto o banco não deixa nem forçando');
  end if;

  return v_out;
end $$;

-- ---------------------------------------------------------------------------
-- Criação pela dona
-- ---------------------------------------------------------------------------
create or replace function book_appointment_as_owner(
  p_service_id uuid,
  p_starts_at  timestamptz,
  p_name       text,
  p_phone      text,
  p_force      boolean default false
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_pro uuid; v_duration integer; v_buffer integer;
  v_price integer; v_discount integer;
  v_require_appr boolean; v_phone text; v_client uuid;
  v_appointment uuid; v_date date; v_tz text;
begin
  -- Só a dona. Sem isto, qualquer pessoa chamaria a versão sem restrições.
  if not is_owner() then
    raise exception 'Apenas a administradora pode agendar por uma cliente.';
  end if;

  if coalesce(trim(p_name), '') = '' then
    raise exception 'Informe o nome da cliente.';
  end if;

  v_phone := regexp_replace(coalesce(p_phone, ''), '\D', '', 'g');
  if length(v_phone) < 10 then
    raise exception 'Informe um telefone com DDD.';
  end if;

  select s.timezone, s.require_approval into v_tz, v_require_appr from settings s;
  v_date := (p_starts_at at time zone v_tz)::date;

  if not p_force and not exists (
    select 1 from available_slots(p_service_id, v_date) s where s.slot = p_starts_at
  ) then
    raise exception 'Esse horário não está disponível. Use a opção de escolher outro horário para forçar.';
  end if;

  select sv.duration_minutes, sv.buffer_minutes into v_duration, v_buffer
  from services sv where sv.id = p_service_id and sv.active;

  if v_duration is null then
    raise exception 'Serviço inativo ou inexistente.';
  end if;

  select pr.price_cents, pr.discount_cents into v_price, v_discount
  from service_price_on(p_service_id, v_date) pr;

  select p.id into v_pro from professionals p
  where p.active order by p.created_at limit 1;

  insert into clients (name, phone) values (trim(p_name), v_phone)
  on conflict (phone) do update set name = excluded.name
  returning id into v_client;

  -- Agendamento lançado pela dona já nasce confirmado: ela acabou de combinar
  -- com a cliente. Deixar pendente a obrigaria a aprovar o próprio lançamento.
  insert into appointments (
    client_id, service_id, professional_id,
    starts_at, ends_at, blocked_until, status, price_cents, discount_cents
  ) values (
    v_client, p_service_id, v_pro, p_starts_at,
    p_starts_at + make_interval(mins => v_duration),
    p_starts_at + make_interval(mins => v_duration + v_buffer),
    'confirmado', v_price, v_discount
  ) returning id into v_appointment;

  return v_appointment;
end $$;

-- O Supabase concede execução de funções ao público por padrão, então
-- `grant ... to authenticated` NÃO exclui a chave anônima — é preciso revogar.
--
-- Descoberto testando: a chave pública conseguiu executar
-- book_appointment_as_owner e só foi barrada pelo `is_owner()` de dentro. A
-- permissão sozinha não teria segurado; a checagem dentro da função sim. As
-- duas juntas é o certo.
revoke execute on function slot_warnings(uuid, timestamptz) from anon, public;
revoke execute on function book_appointment_as_owner(uuid, timestamptz, text, text, boolean)
  from anon, public;

grant execute on function service_price_on(uuid, date) to anon, authenticated;
grant execute on function slot_warnings(uuid, timestamptz) to authenticated;
grant execute on function book_appointment_as_owner(uuid, timestamptz, text, text, boolean) to authenticated;
