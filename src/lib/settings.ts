/**
 * Consultas da tabela `settings`, que tem uma linha só.
 *
 * Aprovação e cancelamento são configuração e não regra fixa no código
 * (DT-008): a dona muda de ideia pela tela, sem depender de alteração.
 */

import { supabase } from '@/lib/supabase';

export type Settings = {
  require_approval: boolean;
  allow_client_cancel: boolean;
  maintenance_reminder_days: number;
};

export async function getSettings(): Promise<Settings | null> {
  const { data, error } = await supabase
    .from('settings')
    .select('require_approval, allow_client_cancel, maintenance_reminder_days')
    .maybeSingle();

  if (error) throw new Error(error.message);
  return (data as Settings) ?? null;
}

export async function updateSettings(patch: Partial<Settings>): Promise<void> {
  // A linha única tem id = true; sem o filtro, o Supabase recusa update sem
  // cláusula where.
  const { error } = await supabase
    .from('settings')
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq('id', true);

  if (error) throw new Error(error.message);
}
