/**
 * Formas de pagamento.
 *
 * Sem importar nada, para os rótulos e a lista serem os mesmos na agenda e no
 * faturamento — e para o dia em que entrar uma forma nova haver um lugar só
 * para mexer.
 */

export type PaymentMethod = 'pix' | 'dinheiro' | 'cartao';

export const PAYMENT_METHODS: { value: PaymentMethod; label: string }[] = [
  { value: 'pix', label: 'Pix' },
  { value: 'dinheiro', label: 'Dinheiro' },
  { value: 'cartao', label: 'Cartão' },
];

/** Nulo não é erro: quer dizer que o atendimento aconteceu e ela não anotou. */
export function paymentLabel(method: PaymentMethod | null): string {
  return PAYMENT_METHODS.find((item) => item.value === method)?.label ?? 'Não anotado';
}
