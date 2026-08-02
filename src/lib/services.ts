/** Consultas da tabela `services`. */

import { type DiscountKind } from '@/lib/pricing';
import { supabase } from '@/lib/supabase';

const SERVICE_COLUMNS =
  'id, name, price_cents, discount_kind, discount_value, duration_minutes, buffer_minutes, active, sort_order';

export type Service = {
  id: string;
  name: string;
  /** Preço cheio. A promoção fica em `discount_*` e não sobrescreve este valor. */
  price_cents: number;
  discount_kind: DiscountKind;
  /** Centavos quando `valor`; de 1 a 100 quando `percentual`. */
  discount_value: number | null;
  /** Duração do atendimento. É o que a cliente vê. */
  duration_minutes: number;
  /** Arrumação depois do atendimento. Bloqueia a agenda sem aparecer para a
   *  cliente — depende do procedimento, não do salão (DT-017). */
  buffer_minutes: number;
  active: boolean;
  sort_order: number;
};

export type ServiceInput = {
  name: string;
  price_cents: number;
  discount_kind: DiscountKind;
  discount_value: number | null;
  duration_minutes: number;
  buffer_minutes: number;
  active: boolean;
  sort_order: number;
};


/**
 * Lista para a tela de configuração: inclui os desativados, que a dona
 * precisa ver para poder reativar. A política pública do banco só devolve os
 * ativos, então a cliente continua sem enxergá-los.
 */
export async function listAllServices(): Promise<Service[]> {
  const { data, error } = await supabase
    .from('services')
    .select(SERVICE_COLUMNS)
    .order('sort_order');

  if (error) throw new Error(error.message);
  return (data ?? []) as Service[];
}

/** O que a cliente vê. O banco também filtra, mas ser explícito aqui evita
 *  que um dia a mesma consulta vaze serviço desativado numa tela pública. */
export async function listActiveServices(): Promise<Service[]> {
  const { data, error } = await supabase
    .from('services')
    .select(SERVICE_COLUMNS)
    .eq('active', true)
    .order('sort_order');

  if (error) throw new Error(error.message);
  return (data ?? []) as Service[];
}

export async function getService(id: string): Promise<Service | null> {
  const { data, error } = await supabase
    .from('services')
    .select(SERVICE_COLUMNS)
    .eq('id', id)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return (data as Service) ?? null;
}

export async function createService(input: ServiceInput): Promise<void> {
  const { error } = await supabase.from('services').insert(input);
  if (error) throw new Error(error.message);
}

export async function updateService(id: string, input: Partial<ServiceInput>): Promise<void> {
  const { error } = await supabase.from('services').update(input).eq('id', id);
  if (error) throw new Error(error.message);
}

/**
 * Serviço sai de circulação sendo desativado, nunca apagado.
 *
 * Apagar quebraria os agendamentos que já apontam para ele — o histórico da
 * cliente e o faturamento ficariam com buracos. O banco inclusive recusa a
 * exclusão, por causa da chave estrangeira com `on delete restrict`.
 */
export async function setServiceActive(id: string, active: boolean): Promise<void> {
  await updateService(id, { active });
}

/**
 * Regrava a ordem inteira a partir da sequência recebida.
 *
 * Trocar apenas o `sort_order` de dois serviços seria menos escrita, mas não
 * funciona se dois deles tiverem acabado com o mesmo número — e aí a lista
 * fica com um item que "não sobe", sintoma difícil de entender. Reescrever
 * tudo mantém a sequência sempre sã, e a lista é pequena.
 */
export async function reorderServices(orderedIds: string[]): Promise<void> {
  for (const [index, id] of orderedIds.entries()) {
    const { error } = await supabase.from('services').update({ sort_order: index }).eq('id', id);
    if (error) throw new Error(error.message);
  }
}
