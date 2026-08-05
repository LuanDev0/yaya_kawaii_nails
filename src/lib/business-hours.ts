/** Consultas da tabela `business_hours`. */

import { supabase } from '@/lib/supabase';

export type BusinessHour = {
  professional_id: string;
  weekday: number;
  opens_at: string;
  closes_at: string;
};

export async function listBusinessHours(professionalId: string): Promise<BusinessHour[]> {
  const { data, error } = await supabase
    .from('business_hours')
    .select('professional_id, weekday, opens_at, closes_at')
    .eq('professional_id', professionalId)
    .order('weekday');

  if (error) throw new Error(error.message);
  return (data ?? []) as BusinessHour[];
}

/**
 * Define a faixa de um dia. Usa upsert porque a tela não precisa saber se
 * aquele dia já tinha faixa: a chave primária é (professional_id, weekday).
 */
export async function setBusinessHour(
  professionalId: string,
  weekday: number,
  opensAt: string,
  closesAt: string,
): Promise<void> {
  const { error } = await supabase.from('business_hours').upsert({
    professional_id: professionalId,
    weekday,
    opens_at: opensAt,
    closes_at: closesAt,
  });

  if (error) throw new Error(error.message);
}

/** Dia sem faixa é dia sem atendimento — a ausência da linha é o "fechado". */
export async function clearBusinessHour(professionalId: string, weekday: number): Promise<void> {
  const { error } = await supabase
    .from('business_hours')
    .delete()
    .eq('professional_id', professionalId)
    .eq('weekday', weekday);

  if (error) throw new Error(error.message);
}
