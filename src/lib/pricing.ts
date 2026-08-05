/**
 * Cálculo de preço com promoção.
 *
 * Módulo próprio, sem tocar no banco, para que a conta possa ser testada
 * isoladamente — arredondamento de porcentagem é onde erro de centavo se
 * esconde, e um centavo errado no preço é o tipo de coisa que a cliente nota.
 */

/**
 * Sem imports de propósito. A data de hoje entra por parâmetro em vez de ser
 * consultada aqui dentro: função que olha o relógio sozinha não dá para
 * testar em outra data, e "só quebra dia 31" é o pior tipo de bug.
 */
type ISODate = string;

/** Vazio significa sem promoção. */
export type DiscountKind = 'valor' | 'percentual' | null;

export type Priced = {
  /** Preço cheio. A promoção não o sobrescreve. */
  price_cents: number;
  discount_kind: DiscountKind;
  /** Centavos quando `valor`; de 1 a 100 quando `percentual`. */
  discount_value: number | null;
  /** Nulo = vale desde já. */
  discount_starts_on: ISODate | null;
  /** Nulo = vale até ser removida. A data é **inclusiva**. */
  discount_ends_on: ISODate | null;
};

export type DiscountState = 'nenhuma' | 'agendada' | 'ativa' | 'encerrada';

/**
 * Em que pé está a promoção hoje.
 *
 * A data final é inclusiva: "até 31/05" significa que 31/05 ainda tem
 * desconto. É como as pessoas leem uma promoção, e o contrário geraria
 * reclamação legítima de cliente no último dia.
 */
export function discountState(item: Priced, today: ISODate): DiscountState {
  if (!item.discount_kind || !item.discount_value) return 'nenhuma';
  if (item.discount_starts_on && today < item.discount_starts_on) return 'agendada';
  if (item.discount_ends_on && today > item.discount_ends_on) return 'encerrada';

  return 'ativa';
}

/**
 * Quanto sai do preço cheio. Zero quando não há promoção valendo hoje.
 *
 * Nunca passa do próprio preço: um desconto em valor maior que o serviço
 * deixaria a cliente vendo preço negativo. O banco impede porcentagem acima
 * de 100, mas não tem como impedir "R$ 200 de desconto num serviço de R$ 120".
 */
export function discountCents(item: Priced, today: ISODate): number {
  if (discountState(item, today) !== 'ativa') return 0;

  const raw =
    item.discount_kind === 'valor'
      ? item.discount_value!
      : Math.round((item.price_cents * item.discount_value!) / 100);

  return Math.min(raw, item.price_cents);
}

/** O que a cliente paga hoje. */
export function finalPriceCents(item: Priced, today: ISODate): number {
  return item.price_cents - discountCents(item, today);
}

export function hasDiscount(item: Priced, today: ISODate): boolean {
  return discountCents(item, today) > 0;
}
