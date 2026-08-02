/**
 * Exceções de agenda: ajustes que substituem o padrão semanal numa data
 * específica (DT-016).
 *
 * Com horário, atende naquela faixa. Sem horário, fecha o dia.
 */

import { addDaysISO, type ISODate } from '@/lib/calendar';
import { supabase } from '@/lib/supabase';

export type ScheduleException = {
  professional_id: string;
  date: ISODate;
  /** Nulo junto com closes_at significa fechado o dia todo. */
  opens_at: string | null;
  closes_at: string | null;
  note: string | null;
};

/**
 * `note` fica de fora das consultas públicas de propósito: a coluna é
 * restrita por permissão, e `select('*')` seria recusado para a chave da
 * cliente. Ver a armadilha documentada em docs/BANCO-DE-DADOS.md.
 */
const PUBLIC_COLUMNS = 'professional_id, date, opens_at, closes_at';
const OWNER_COLUMNS = `${PUBLIC_COLUMNS}, note`;

export async function listExceptions(
  professionalId: string,
  from: ISODate,
  to: ISODate,
  includeNote = false,
): Promise<ScheduleException[]> {
  const { data, error } = await supabase
    .from('schedule_exceptions')
    .select(includeNote ? OWNER_COLUMNS : PUBLIC_COLUMNS)
    .eq('professional_id', professionalId)
    .gte('date', from)
    .lte('date', to)
    .order('date');

  if (error) throw new Error(error.message);
  return (data ?? []) as unknown as ScheduleException[];
}

/** Fecha o dia inteiro, ou define uma faixa diferente do padrão. */
export async function setException(
  professionalId: string,
  date: ISODate,
  opensAt: string | null,
  closesAt: string | null,
  note: string | null,
): Promise<void> {
  const { error } = await supabase.from('schedule_exceptions').upsert({
    professional_id: professionalId,
    date,
    opens_at: opensAt,
    closes_at: closesAt,
    note,
  });

  if (error) throw new Error(error.message);
}

/** Remove a exceção: aquela data volta a seguir o padrão semanal. */
export async function clearException(professionalId: string, date: ISODate): Promise<void> {
  const { error } = await supabase
    .from('schedule_exceptions')
    .delete()
    .eq('professional_id', professionalId)
    .eq('date', date);

  if (error) throw new Error(error.message);
}

/**
 * Fecha um período inteiro — férias, viagem.
 *
 * Grava uma linha por dia em vez de um intervalo. Duas formas de guardar a
 * mesma informação significariam dois lugares para consultar na hora de
 * calcular disponibilidade, e é aí que uma delas acaba esquecida.
 */
export async function closePeriod(
  professionalId: string,
  from: ISODate,
  to: ISODate,
  note: string | null,
): Promise<number> {
  const rows: {
    professional_id: string;
    date: ISODate;
    opens_at: null;
    closes_at: null;
    note: string | null;
  }[] = [];

  for (let date = from; date <= to; date = addDaysISO(date, 1)) {
    rows.push({ professional_id: professionalId, date, opens_at: null, closes_at: null, note });
  }

  const { error } = await supabase.from('schedule_exceptions').upsert(rows);
  if (error) throw new Error(error.message);

  return rows.length;
}
