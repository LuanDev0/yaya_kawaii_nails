-- Forma de pagamento.
--
-- Fica no próprio atendimento, e não numa tabela de pagamentos: um atendimento
-- aqui é pago de uma vez, na hora. Tabela à parte só se justificaria com
-- parcelamento ou pagamento dividido, que não existem neste salão.
--
-- ---------------------------------------------------------------------------
-- Aceita nulo de propósito
--
-- Concluir o atendimento não pode depender de ela lembrar como foi pago. Se
-- fosse obrigatório, o jeito mais rápido de fechar o dia passaria a ser não
-- fechar — e aí o faturamento inteiro para de existir para proteger um campo
-- secundário. Nulo quer dizer "aconteceu, não anotei", e a tela de faturamento
-- mostra esses à parte para ela completar depois.
-- ---------------------------------------------------------------------------
alter table appointments
  add column if not exists payment_method text
    check (payment_method in ('pix', 'dinheiro', 'cartao'));

comment on column appointments.payment_method is
  'pix, dinheiro ou cartao. Nulo = atendimento aconteceu e a forma nao foi anotada.';
