/** Consultas da tabela `services`. */

import { supabase } from '@/lib/supabase';

export type Service = {
  id: string;
  name: string;
  price_cents: number;
  duration_minutes: number;
  active: boolean;
  sort_order: number;
};

export type ServiceInput = {
  name: string;
  price_cents: number;
  duration_minutes: number;
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
    .select('id, name, price_cents, duration_minutes, active, sort_order')
    .order('sort_order');

  if (error) throw new Error(error.message);
  return (data ?? []) as Service[];
}

/** O que a cliente vê. O banco também filtra, mas ser explícito aqui evita
 *  que um dia a mesma consulta vaze serviço desativado numa tela pública. */
export async function listActiveServices(): Promise<Service[]> {
  const { data, error } = await supabase
    .from('services')
    .select('id, name, price_cents, duration_minutes, active, sort_order')
    .eq('active', true)
    .order('sort_order');

  if (error) throw new Error(error.message);
  return (data ?? []) as Service[];
}

export async function getService(id: string): Promise<Service | null> {
  const { data, error } = await supabase
    .from('services')
    .select('id, name, price_cents, duration_minutes, active, sort_order')
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
