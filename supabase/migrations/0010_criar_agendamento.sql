-- Criação de agendamento pela cliente.
--
-- A cliente não escreve na tabela: ela chama esta função, que recebe apenas
-- serviço, horário, nome e telefone. Preço, duração, arrumação e status são
-- decididos aqui.
--
-- Abrir a tabela para inserção direta deixaria a cliente escolher o que
-- gravar — inclusive o preço. Validar na tela não resolve: a tela roda no
-- navegador dela.

create or replace function book_appointment(
  p_service_id uuid,
  p_starts_at  timestamptz,
  p_name       text,
  p_phone      text
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_pro           uuid;
  v_duration      integer;
  v_buffer        integer;
  v_full_price    integer;
  v_price         integer;
  v_discount      integer;
  v_kind          text;
  v_value         integer;
  v_from          date;
  v_to            date;
  v_require_appr  boolean;
  v_phone         text;
  v_client        uuid;
  v_appointment   uuid;
  v_today         date;
  v_tz            text;
begin
  if coalesce(trim(p_name), '') = '' then
    raise exception 'Informe seu nome.';
  end if;

  -- Só dígitos: "(11) 99999-0000" e "11999990000" são a mesma pessoa, e sem
  -- normalizar viram duas clientes com históricos separados.
  v_phone := regexp_replace(coalesce(p_phone, ''), '\D', '', 'g');

  if length(v_phone) < 10 then
    raise exception 'Informe um telefone com DDD.';
  end if;

  select s.timezone, s.require_approval into v_tz, v_require_appr from settings s;
  v_today := (p_starts_at at time zone v_tz)::date;

  -- A checagem que sustenta tudo: o horário pedido precisa estar entre os que
  -- a própria função de disponibilidade ofereceria. Assim expediente, exceção,
  -- antecedência, janela e colisão são verificados por um caminho só — não há
  -- como a validação daqui divergir da lista mostrada à cliente.
  if not exists (
    select 1 from available_slots(p_service_id, v_today) s where s.slot = p_starts_at
  ) then
    raise exception 'Esse horário não está mais disponível.';
  end if;

  -- Preço decidido aqui, nunca recebido da cliente.
  select
    sv.duration_minutes, sv.buffer_minutes, sv.price_cents,
    sv.discount_kind, sv.discount_value, sv.discount_starts_on, sv.discount_ends_on
    into v_duration, v_buffer, v_full_price, v_kind, v_value, v_from, v_to
  from services sv where sv.id = p_service_id and sv.active;

  -- A regra do desconto aparece uma vez só. Duas cópias seriam duas chances de
  -- alguém mudar a promoção e o valor cobrado deixar de bater com o registrado.
  v_discount := case
    when v_kind is null or v_value is null then 0
    when v_from is not null and v_today < v_from then 0
    when v_to is not null and v_today > v_to then 0
    when v_kind = 'valor' then least(v_value, v_full_price)
    else least(round(v_full_price * v_value / 100.0), v_full_price)
  end;

  v_price := v_full_price - v_discount;

  select p.id into v_pro
  from professionals p where p.active order by p.created_at limit 1;

  -- Cliente que já se atendeu é reaproveitada pelo telefone; o nome é
  -- atualizado, caso ela tenha escrito diferente da última vez.
  insert into clients (name, phone)
  values (trim(p_name), v_phone)
  on conflict (phone) do update set name = excluded.name
  returning id into v_client;

  insert into appointments (
    client_id, service_id, professional_id,
    starts_at, ends_at, blocked_until,
    status, price_cents, discount_cents
  )
  values (
    v_client, p_service_id, v_pro,
    p_starts_at,
    p_starts_at + make_interval(mins => v_duration),
    p_starts_at + make_interval(mins => v_duration + v_buffer),
    case when v_require_appr then 'pendente' else 'confirmado' end,
    v_price, v_discount
  )
  returning id into v_appointment;

  return v_appointment;
end $$;

grant execute on function book_appointment(uuid, timestamptz, text, text) to anon, authenticated;

-- ---------------------------------------------------------------------------
-- Consulta do próprio agendamento
--
-- A cliente não tem senha (DT-004), então o identificador do agendamento é o
-- que prova que ele é dela: é um uuid aleatório, guardado no navegador que o
-- criou. Quem não tem o código não descobre nada.
--
-- Não existe busca por telefone de propósito — ela deixaria qualquer pessoa
-- que saiba o número de outra ver o histórico dela.
-- ---------------------------------------------------------------------------
create or replace function appointment_details(p_id uuid)
returns table (
  id            uuid,
  starts_at     timestamptz,
  ends_at       timestamptz,
  status        text,
  service_name  text,
  price_cents   integer
)
language sql
stable
security definer
set search_path = public
as $$
  select a.id, a.starts_at, a.ends_at, a.status, sv.name, a.price_cents
  from appointments a
  join services sv on sv.id = a.service_id
  where a.id = p_id;
$$;

grant execute on function appointment_details(uuid) to anon, authenticated;
