-- Quem está na hora de voltar.
--
-- Cruza três coisas: o último atendimento concluído de cada cliente, o prazo
-- de retorno configurado, e quem já tem horário marcado. Sem o último filtro,
-- a lista chamaria de volta quem vem semana que vem — e uma mensagem dessas
-- faz a cliente achar que a dona não sabe da própria agenda.

create or replace function clients_due_for_return()
returns table (
  client_id  uuid,
  name       text,
  phone      text,
  last_visit timestamptz,
  days_since integer
)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_days integer;
begin
  -- A lista devolve nome e telefone de clientes. Sem esta checagem, qualquer
  -- pessoa autenticada teria a agenda de contatos do salão.
  if not is_owner() then
    raise exception 'Apenas a administradora pode ver a lista de retorno.';
  end if;

  select s.maintenance_reminder_days into v_days from settings s;

  return query
  with last_visits as (
    select a.client_id, max(a.starts_at) as visited_at
    from appointments a
    where a.status = 'concluido'
    group by a.client_id
  ),
  booked as (
    select distinct a.client_id
    from appointments a
    where a.status in ('pendente', 'confirmado')
      and a.starts_at >= now()
  )
  select
    c.id, c.name, c.phone, lv.visited_at,
    extract(day from now() - lv.visited_at)::integer
  from last_visits lv
  join clients c on c.id = lv.client_id
  where lv.visited_at < now() - make_interval(days => v_days)
    and not exists (select 1 from booked b where b.client_id = lv.client_id)
  -- Quem sumiu há mais tempo primeiro: é quem corre mais risco de não voltar.
  order by lv.visited_at;
end $$;

revoke execute on function clients_due_for_return() from anon, public;
grant execute on function clients_due_for_return() to authenticated;
