-- Cálculo de horários disponíveis, dentro do banco.
--
-- A cliente precisa saber o que está livre, mas não pode ler `appointments` —
-- veria nome, telefone e serviço das outras clientes. E não adianta calcular
-- no app: o que o navegador dela calcula, ela precisou baixar antes.
--
-- Por isso a conta acontece aqui, com acesso privilegiado, e o que sai é
-- apenas uma lista de horários vagos.

-- ---------------------------------------------------------------------------
-- Fuso do salão
--
-- Sem isto o Postgres usa UTC e todos os horários saem 3 horas deslocados.
-- Fica como configuração porque o Brasil tem mais de um fuso.
-- ---------------------------------------------------------------------------
alter table settings
  add column if not exists timezone text not null default 'America/Sao_Paulo';

create or replace function available_slots(p_service_id uuid, p_date date)
returns table (slot timestamptz)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_tz            text;
  v_notice_hours  integer;
  v_window_days   integer;
  v_duration      integer;
  v_buffer        integer;
  v_pro           uuid;
  v_opens         time;
  v_closes        time;
  v_has_exception boolean;
  -- Grade de 15 minutos: horário redondo é mais fácil de combinar e de lembrar
  -- que "16:55". O tempo perdido entre um atendimento e o próximo encaixe é
  -- pequeno perto da confusão de horários quebrados.
  v_step          integer := 15;
  v_occupies      interval;
begin
  select s.timezone, s.minimum_notice_hours, s.booking_window_days
    into v_tz, v_notice_hours, v_window_days
  from settings s;

  -- Serviço inativo não gera horário: some do catálogo e da agenda junto.
  select sv.duration_minutes, sv.buffer_minutes
    into v_duration, v_buffer
  from services sv
  where sv.id = p_service_id and sv.active;

  if v_duration is null then
    return;
  end if;

  -- Uma profissional por enquanto (DT-007).
  select p.id into v_pro
  from professionals p
  where p.active
  order by p.created_at
  limit 1;

  if v_pro is null then
    return;
  end if;

  -- Fora da janela de agendamento não há horário nenhum.
  if p_date > ((now() at time zone v_tz)::date + v_window_days) then
    return;
  end if;

  -- A exceção da data vence o padrão semanal (DT-016).
  select true, e.opens_at, e.closes_at
    into v_has_exception, v_opens, v_closes
  from schedule_exceptions e
  where e.professional_id = v_pro and e.date = p_date;

  if v_has_exception then
    -- Exceção sem horário fecha o dia.
    if v_opens is null then
      return;
    end if;
  else
    select b.opens_at, b.closes_at
      into v_opens, v_closes
    from business_hours b
    where b.professional_id = v_pro
      and b.weekday = extract(dow from p_date);

    -- Dia sem faixa no padrão é dia sem atendimento.
    if v_opens is null then
      return;
    end if;
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
  select c.starts_at
  from candidates c
  where
    -- Cabe antes de fechar, contando a arrumação.
    c.starts_at + v_occupies <= (p_date + v_closes) at time zone v_tz

    -- Respeita a antecedência mínima.
    and c.starts_at >= now() + make_interval(hours => v_notice_hours)

    -- Não encosta em nada já marcado. A faixa vai até blocked_until, então o
    -- tempo de arrumação da cliente anterior também bloqueia.
    and not exists (
      select 1
      from appointments a
      where a.professional_id = v_pro
        and a.status in ('pendente', 'confirmado')
        and tstzrange(a.starts_at, a.blocked_until)
            && tstzrange(c.starts_at, c.starts_at + v_occupies)
    )
  order by c.starts_at;
end $$;

-- A função é o único caminho da cliente até a agenda. Ela roda com acesso
-- privilegiado, mas devolve só horários — nunca quem marcou o quê.
grant execute on function available_slots(uuid, date) to anon, authenticated;
