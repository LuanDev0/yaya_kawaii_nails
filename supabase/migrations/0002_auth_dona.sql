-- Camada 2: autenticação da dona e permissões de escrita.
--
-- Pré-requisito: a conta já deve existir em Authentication → Users.
-- Depois desta migration, rode 0003_vincula_conta.sql com o email da conta.

-- ---------------------------------------------------------------------------
-- Vínculo entre a conta de login e a profissional
--
-- É este vínculo que sustenta a segurança, e não o fato de estar logado.
-- O Supabase vem com cadastro aberto: se as políticas perguntassem apenas
-- "está autenticado?", qualquer pessoa que criasse uma conta no projeto seria
-- tratada como a dona, com acesso à agenda e aos dados das clientes.
--
-- Perguntando "existe uma profissional cujo auth_user_id é o usuário logado?",
-- uma conta criada por fora não corresponde a nenhuma linha e não vê nada.
-- ---------------------------------------------------------------------------
alter table professionals
  add column auth_user_id uuid unique references auth.users(id) on delete set null;

-- Função auxiliar, para as políticas não repetirem a mesma subconsulta.
--
-- security definer: precisa ler professionals ignorando o RLS da própria
-- tabela, senão a política que a chama entraria em recursão infinita.
-- set search_path: evita que um schema malicioso no caminho de busca
-- sequestre a resolução dos nomes dentro de uma função security definer.
create or replace function is_owner()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from professionals
    where auth_user_id = auth.uid()
      and active
  );
$$;

-- ---------------------------------------------------------------------------
-- Permissões de escrita da dona
--
-- Leitura do catálogo continua pública (migration 0001). Aqui entra o que só
-- a dona pode fazer. Dados de cliente e agendamento seguem fechados para o
-- público — o fluxo de agendamento é a camada 3.
-- ---------------------------------------------------------------------------

create policy "dona gerencia servicos"
  on services for all to authenticated
  using (is_owner()) with check (is_owner());

create policy "dona gerencia horarios"
  on business_hours for all to authenticated
  using (is_owner()) with check (is_owner());

create policy "dona gerencia preferencias"
  on settings for all to authenticated
  using (is_owner()) with check (is_owner());

create policy "dona ve as profissionais"
  on professionals for select to authenticated
  using (is_owner());

create policy "dona edita a propria ficha"
  on professionals for update to authenticated
  using (auth_user_id = auth.uid()) with check (auth_user_id = auth.uid());

-- A dona enxerga e gerencia clientes e agendamentos desde já: são as telas de
-- agenda e ficha. O acesso da cliente entra na camada 3, com regras próprias.
create policy "dona gerencia clientes"
  on clients for all to authenticated
  using (is_owner()) with check (is_owner());

create policy "dona gerencia agendamentos"
  on appointments for all to authenticated
  using (is_owner()) with check (is_owner());

-- ---------------------------------------------------------------------------
-- Serviço desativado continua visível para a dona
--
-- A política pública da migration 0001 filtra por `active`. Serviço desativado
-- não pode sumir do painel, senão a dona não consegue reativar nem ver o que
-- já foi agendado com ele. A política acima ("dona gerencia servicos") já
-- cobre isso, porque não filtra por active.
-- ---------------------------------------------------------------------------
