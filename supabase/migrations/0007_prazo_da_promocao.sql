-- Prazo da promoção.
--
-- Sem prazo, promoção de dia das mães fica ligada até junho porque ninguém
-- lembrou de desligar. Com data de início, dá inclusive para deixar preparada
-- e ela começa sozinha.
--
-- Nulo em qualquer um dos lados significa "sem limite daquele lado":
--   sem início -> vale desde já
--   sem fim    -> vale até ser removida à mão

alter table services
  add column discount_starts_on date,
  add column discount_ends_on date,

  add constraint prazo_coerente check (
    discount_starts_on is null
    or discount_ends_on is null
    or discount_ends_on >= discount_starts_on
  );
