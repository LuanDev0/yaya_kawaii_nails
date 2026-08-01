-- Schema inicial do yaya_kawaii_nails — camada 1B, julho de 2026.
--
-- Para aplicar: painel do Supabase → SQL Editor → cole este arquivo → Run.

create extension if not exists btree_gist;

-- ---------------------------------------------------------------------------
-- Profissionais
--
-- Uma linha por enquanto. A tabela existe desde já porque mudar a chave de um
-- agendamento depois que houver dados reais é o tipo de migração que dá medo
-- de fazer e acaba virando remendo (DT-007).
-- ---------------------------------------------------------------------------
create table professionals (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  active     boolean not null default true,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Serviços
--
-- Preço em centavos (integer), não em decimal: dinheiro guardado como número
-- de ponto flutuante acumula erro de arredondamento, e no relatório de
-- faturamento isso aparece como centavos que não fecham.
-- ---------------------------------------------------------------------------
create table services (
  id               uuid primary key default gen_random_uuid(),
  name             text not null,
  price_cents      integer not null check (price_cents >= 0),
  duration_minutes integer not null check (duration_minutes > 0),
  active           boolean not null default true,
  sort_order       integer not null default 0,
  created_at       timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Clientes
--
-- O telefone é a identidade: não há senha (DT-004). Guardar só dígitos, para
-- que "(11) 99999-0000" e "11999990000" não virem duas clientes.
-- ---------------------------------------------------------------------------
create table clients (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  phone       text not null unique,
  birth_date  date,
  preferences text,
  notes       text,
  created_at  timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Agendamentos
--
-- price_cents é uma cópia do preço no momento da marcação, de propósito. Se o
-- preço do serviço subir depois, o histórico precisa continuar mostrando o que
-- foi realmente cobrado — senão o faturamento do mês passado muda sozinho.
-- ---------------------------------------------------------------------------
create table appointments (
  id              uuid primary key default gen_random_uuid(),
  client_id       uuid not null references clients(id) on delete restrict,
  service_id      uuid not null references services(id) on delete restrict,
  professional_id uuid not null references professionals(id) on delete restrict,
  starts_at       timestamptz not null,
  ends_at         timestamptz not null,
  status          text not null default 'pendente'
                    check (status in ('pendente', 'confirmado', 'cancelado', 'concluido')),
  price_cents     integer not null check (price_cents >= 0),
  notes           text,
  created_at      timestamptz not null default now(),

  constraint horario_valido check (ends_at > starts_at)
);

-- A garantia que justificou escolher Postgres em vez de Firestore (DT-002).
--
-- Duas clientes agendando o mesmo horário no mesmo instante: o banco recusa a
-- segunda. Não depende de o app ter checado antes — e é justamente na disputa
-- simultânea que a checagem no app falha, porque as duas leem "livre" antes de
-- qualquer uma escrever.
--
-- O WHERE deixa de fora cancelado e concluido: horário cancelado volta a ficar
-- livre, e atendimento concluído não deve bloquear remarcação no mesmo espaço.
alter table appointments add constraint sem_sobreposicao
  exclude using gist (
    professional_id with =,
    tstzrange(starts_at, ends_at) with &&
  ) where (status in ('pendente', 'confirmado'));

create index appointments_starts_at_idx on appointments (starts_at);
create index appointments_client_idx on appointments (client_id);

-- ---------------------------------------------------------------------------
-- Horários de atendimento
--
-- weekday segue a convenção do JavaScript: 0 = domingo, 6 = sábado.
-- ---------------------------------------------------------------------------
create table business_hours (
  professional_id uuid not null references professionals(id) on delete cascade,
  weekday         smallint not null check (weekday between 0 and 6),
  opens_at        time not null,
  closes_at       time not null,

  primary key (professional_id, weekday),
  constraint faixa_valida check (closes_at > opens_at)
);

-- ---------------------------------------------------------------------------
-- Configurações
--
-- Tabela de uma linha só: a chave primária é um boolean que só aceita true,
-- então uma segunda linha é impossível. Evita o clássico "qual das duas linhas
-- de configuração vale?".
--
-- Aprovação e cancelamento são chaves, não regra fixa no código (DT-008).
-- ---------------------------------------------------------------------------
create table settings (
  id                        boolean primary key default true check (id),
  require_approval          boolean not null default true,
  allow_client_cancel       boolean not null default true,
  maintenance_reminder_days integer not null default 21 check (maintenance_reminder_days > 0),
  updated_at                timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Regras de acesso
--
-- RLS ligado em tudo. Sem política, ninguém lê nem escreve — é o padrão seguro.
-- As exceções abaixo são o catálogo, que a cliente precisa ver para agendar.
--
-- Dados pessoais (clients, appointments) e configurações continuam fechados. O
-- fluxo de agendamento entra na camada 2, com as políticas específicas.
-- ---------------------------------------------------------------------------
alter table professionals   enable row level security;
alter table services        enable row level security;
alter table clients         enable row level security;
alter table appointments    enable row level security;
alter table business_hours  enable row level security;
alter table settings        enable row level security;

create policy "catalogo de servicos e publico"
  on services for select to anon, authenticated
  using (active);

create policy "profissionais ativas sao publicas"
  on professionals for select to anon, authenticated
  using (active);

create policy "horarios de atendimento sao publicos"
  on business_hours for select to anon, authenticated
  using (true);

-- ---------------------------------------------------------------------------
-- Dados de exemplo
--
-- Valores fictícios, para o app ter o que mostrar enquanto a tela de
-- configuração não existe. Serão substituídos pelos reais (camada 7).
-- ---------------------------------------------------------------------------
insert into settings (id) values (true);

insert into professionals (id, name)
values ('00000000-0000-0000-0000-000000000001', 'Yaya');

insert into services (name, price_cents, duration_minutes, sort_order) values
  ('Alongamento em gel', 12000, 150, 1),
  ('Manutenção',          8000,  90, 2),
  ('Esmaltação em gel',   5000,  60, 3),
  ('Blindagem',           6000,  60, 4);

-- Terça a sábado, 9h às 18h.
insert into business_hours (professional_id, weekday, opens_at, closes_at)
select '00000000-0000-0000-0000-000000000001', weekday, '09:00', '18:00'
from generate_series(2, 6) as weekday;
