-- Fotos dos trabalhos.
--
-- Dois usos com naturezas diferentes, e por isso dois lugares:
--
--   galeria      vitrine, feita para ser vista — armazenamento público
--   atendimentos a unha da cliente no histórico dela — armazenamento privado
--
-- A cliente que faz uma manutenção não escolheu aparecer em vitrine. Jogar
-- tudo no público deixaria qualquer pessoa que descobrisse o endereço ver as
-- mãos de todas as clientes do salão.

-- ---------------------------------------------------------------------------
-- Os dois depósitos
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('galeria', 'galeria', true)
on conflict (id) do nothing;

insert into storage.buckets (id, name, public)
values ('atendimentos', 'atendimentos', false)
on conflict (id) do nothing;

-- Só a dona envia e apaga arquivo; a galeria é lida por qualquer um porque o
-- depósito é público, e os atendimentos só por ela, com link temporário.
create policy "dona envia na galeria"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'galeria' and is_owner());

create policy "dona apaga da galeria"
  on storage.objects for delete to authenticated
  using (bucket_id = 'galeria' and is_owner());

create policy "dona envia atendimentos"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'atendimentos' and is_owner());

create policy "dona le atendimentos"
  on storage.objects for select to authenticated
  using (bucket_id = 'atendimentos' and is_owner());

create policy "dona apaga atendimentos"
  on storage.objects for delete to authenticated
  using (bucket_id = 'atendimentos' and is_owner());

-- ---------------------------------------------------------------------------
-- Galeria
--
-- A ordem é da dona: a primeira foto é o cartão de visitas do salão, e ela
-- precisa poder escolher qual é.
-- ---------------------------------------------------------------------------
create table if not exists gallery_photos (
  id         uuid primary key default gen_random_uuid(),
  path       text not null unique,
  caption    text,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

alter table gallery_photos enable row level security;

create policy "galeria e publica"
  on gallery_photos for select to anon, authenticated
  using (true);

create policy "dona gerencia a galeria"
  on gallery_photos for all to authenticated
  using (is_owner()) with check (is_owner());

-- ---------------------------------------------------------------------------
-- Fotos de atendimento
--
-- Ligadas ao agendamento, não à cliente: assim a foto fica presa ao dia em
-- que o trabalho foi feito, que é o que interessa para acompanhar a unha.
-- ---------------------------------------------------------------------------
create table if not exists appointment_photos (
  id             uuid primary key default gen_random_uuid(),
  appointment_id uuid not null references appointments(id) on delete cascade,
  path           text not null unique,
  note           text,
  created_at     timestamptz not null default now()
);

alter table appointment_photos enable row level security;

-- Sem política para a chave pública: nem a existência da foto é assunto dela.
create policy "dona gerencia fotos de atendimento"
  on appointment_photos for all to authenticated
  using (is_owner()) with check (is_owner());

create index appointment_photos_appointment_idx
  on appointment_photos (appointment_id);
