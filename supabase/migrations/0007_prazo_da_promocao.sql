-- Prazo da promoção.
--
-- Sem prazo, promoção de dia das mães fica ligada até junho porque ninguém
-- lembrou de desligar. Com data de início, dá inclusive para deixar preparada
-- e ela começa sozinha.
--
-- Nulo em qualquer um dos lados significa "sem limite daquele lado":
--   sem início -> vale desde já
--   sem fim    -> vale até ser removida à mão

-- `if not exists` e a checagem em pg_constraint deixam este arquivo seguro para
-- rodar duas vezes. Sem isso, reexecutar por engano devolve um erro que parece
-- grave ("column already exists") mas só diz que já estava feito — e no meio de
-- um bloco maior, esconde o que de fato faltava aplicar.
alter table services
  add column if not exists discount_starts_on date,
  add column if not exists discount_ends_on date;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'prazo_coerente'
  ) then
    alter table services add constraint prazo_coerente check (
      discount_starts_on is null
      or discount_ends_on is null
      or discount_ends_on >= discount_starts_on
    );
  end if;
end $$;
