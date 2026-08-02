-- Promoção por serviço, em valor fixo ou porcentagem.
--
-- O desconto fica em colunas próprias em vez de baixar price_cents. Assim o
-- preço cheio não se perde: acabada a promoção, basta limpar o desconto, e a
-- cliente pode ver "de R$ 120 por R$ 96" — que vende bem mais que só "R$ 96".

alter table services
  add column discount_kind text check (discount_kind in ('valor', 'percentual')),
  add column discount_value integer,

  -- Ou nenhum desconto, ou um desconto que faz sentido. Porcentagem acima de
  -- 100 daria preço negativo; desconto zerado seria promoção que não desconta.
  add constraint desconto_coerente check (
    (discount_kind is null and discount_value is null)
    or (discount_kind = 'valor' and discount_value > 0)
    or (discount_kind = 'percentual' and discount_value > 0 and discount_value <= 100)
  );

-- ---------------------------------------------------------------------------
-- Quanto de desconto foi dado no atendimento
--
-- price_cents já guarda o valor cobrado. Sem esta coluna, o faturamento
-- mostraria R$ 96 sem que houvesse como saber quanto foi de promoção no mês.
--
-- Entra agora porque o banco ainda não tem nenhum agendamento. Depois da
-- agenda em uso, os atendimentos antigos ficariam sem essa informação para
-- sempre — mesmo raciocínio do preço congelado no agendamento.
-- ---------------------------------------------------------------------------
alter table appointments
  add column discount_cents integer not null default 0
    check (discount_cents >= 0);
