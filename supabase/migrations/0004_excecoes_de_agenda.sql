-- Exceções de agenda e limites de agendamento (DT-016).

-- ---------------------------------------------------------------------------
-- Exceções por data
--
-- Uma linha substitui o padrão semanal naquela data:
--   com horário  -> atende nessa faixa, ignorando o padrão do dia da semana
--   sem horário  -> não atende, mesmo que o padrão diga que sim
--
-- Como a exceção tanto abre quanto fecha, o modelo serve para quem tem rotina
-- estável (padrão + poucas exceções) e para quem não tem nenhuma (padrão vazio
-- e uma exceção por dia trabalhado). A escolha é de uso, não de estrutura.
-- ---------------------------------------------------------------------------
create table schedule_exceptions (
  professional_id uuid not null references professionals(id) on delete cascade,
  date            date not null,
  opens_at        time,
  closes_at       time,
  note            text,
  created_at      timestamptz not null default now(),

  primary key (professional_id, date),

  -- Ou os dois horários, ou nenhum. Um só seria estado sem significado.
  constraint faixa_coerente check (
    (opens_at is null and closes_at is null)
    or (opens_at is not null and closes_at is not null and closes_at > opens_at)
  )
);

-- ---------------------------------------------------------------------------
-- Limites de agendamento
--
-- Chaves, não constantes no código: a dona ajusta conforme aprende o próprio
-- ritmo, que é a razão de existir a tela de preferências (DT-008).
-- ---------------------------------------------------------------------------
alter table settings
  add column booking_window_days integer not null default 14
    check (booking_window_days > 0),
  add column minimum_notice_hours integer not null default 3
    check (minimum_notice_hours >= 0);

-- ---------------------------------------------------------------------------
-- Acesso
--
-- A cliente precisa ler as exceções para o calendário mostrar os dias certos:
-- sem isso ela veria como livre um dia que a dona fechou.
--
-- Mas `note` guarda o motivo — "viagem", "consulta médica" — e isso é assunto
-- da dona. RLS controla LINHA, não coluna: liberar a linha para a cliente
-- entregaria o motivo junto. A restrição por coluna é o mecanismo certo, e
-- precisa de revoke antes, porque o Supabase concede select em tudo por padrão.
-- ---------------------------------------------------------------------------
alter table schedule_exceptions enable row level security;

revoke select on schedule_exceptions from anon;
grant select (professional_id, date, opens_at, closes_at)
  on schedule_exceptions to anon;

create policy "excecoes de agenda sao publicas"
  on schedule_exceptions for select to anon
  using (true);

create policy "dona gerencia excecoes"
  on schedule_exceptions for all to authenticated
  using (is_owner()) with check (is_owner());

create index schedule_exceptions_date_idx on schedule_exceptions (date);
