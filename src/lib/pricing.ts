/**
 * Cálculo de preço com promoção.
 *
 * Módulo próprio, sem tocar no banco, para que a conta possa ser testada
 * isoladamente — arredondamento de porcentagem é onde erro de centavo se
 * esconde, e um centavo errado no preço é o tipo de coisa que a cliente nota.
 */

/** Vazio significa sem promoção. */
export type DiscountKind = 'valor' | 'percentual' | null;

export type Priced = {
  /** Preço cheio. A promoção não o sobrescreve. */
  price_cents: number;
  discount_kind: DiscountKind;
  /** Centavos quando `valor`; de 1 a 100 quando `percentual`. */
  discount_value: number | null;
};

/**
 * Quanto sai do preço cheio. Zero quando não há promoção.
 *
 * Nunca passa do próprio preço: um desconto em valor maior que o serviço
 * deixaria a cliente vendo preço negativo. O banco impede porcentagem acima
 * de 100, mas não tem como impedir "R$ 200 de desconto num serviço de R$ 120".
 */
export function discountCents(item: Priced): number {
  if (!item.discount_kind || !item.discount_value) return 0;

  const raw =
    item.discount_kind === 'valor'
      ? item.discount_value
      : Math.round((item.price_cents * item.discount_value) / 100);

  return Math.min(raw, item.price_cents);
}

/** O que a cliente paga. */
export function finalPriceCents(item: Priced): number {
  return item.price_cents - discountCents(item);
}

export function hasDiscount(item: Priced): boolean {
  return discountCents(item) > 0;
}
