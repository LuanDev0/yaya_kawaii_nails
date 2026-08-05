/**
 * A agenda da dona.
 *
 * Aqui as consultas vão direto às tabelas, e não pelas funções do banco: a
 * política de acesso já reconhece a dona, e ela pode ver tudo mesmo. As
 * funções existem para proteger a cliente, que não pode.
 */

import { type AppointmentStatus } from '@/lib/booking';
import { addDaysISO, todayISO } from '@/lib/calendar';
import { supabase } from '@/lib/supabase';

export type AgendaItem = {
  id: string;
  client_id: string;
  starts_at: string;
  ends_at: string;
  status: AppointmentStatus;
  price_cents: number;
  discount_cents: number;
  notes: string | null;
  client_name: string;
  client_phone: string;
  services: string[];
};

type Row = {
  id: string;
  client_id: string;
  starts_at: string;
  ends_at: string;
  status: AppointmentStatus;
  price_cents: number;
  discount_cents: number;
  notes: string | null;
  clients: { name: string; phone: string } | null;
  appointment_services: { services: { name: string } | null }[] | null;
};

function toItem(row: Row): AgendaItem {
  return {
    id: row.id,
    client_id: row.client_id,
    starts_at: row.starts_at,
    ends_at: row.ends_at,
    status: row.status,
    price_cents: row.price_cents,
    discount_cents: row.discount_cents,
    notes: row.notes,
    client_name: row.clients?.name ?? 'Cliente removida',
    client_phone: row.clients?.phone ?? '',
    services: (row.appointment_services ?? [])
      .map((link) => link.services?.name)
      .filter((name): name is string => Boolean(name)),
  };
}

const SELECT =
  'id, client_id, starts_at, ends_at, status, price_cents, discount_cents, notes, clients(name, phone), appointment_services(services(name))';

/**
 * Tudo que ainda espera uma decisão dela.
 *
 * Junta dois casos que parecem diferentes e não são: o pedido que ninguém
 * aprovou, e o atendimento confirmado cuja hora já passou sem ser fechado.
 * Os dois são a agenda cobrando uma resposta — e o segundo é justamente o que
 * some da vista quando a lista só mostra o futuro.
 */
export async function listPending(): Promise<AgendaItem[]> {
  const { data, error } = await supabase
    .from('appointments')
    .select(SELECT)
    .or(`status.eq.pendente,and(status.eq.confirmado,starts_at.lt.${new Date().toISOString()})`)
    .order('starts_at');

  if (error) throw new Error(error.message);
  return ((data ?? []) as unknown as Row[]).map(toItem);
}

/** Os próximos atendimentos, a partir de agora. */
export async function listUpcoming(days = 30): Promise<AgendaItem[]> {
  const { data, error } = await supabase
    .from('appointments')
    .select(SELECT)
    .in('status', ['pendente', 'confirmado'])
    .gte('starts_at', new Date().toISOString())
    .lte('starts_at', `${addDaysISO(todayISO(), days)}T23:59:59`)
    .order('starts_at');

  if (error) throw new Error(error.message);
  return ((data ?? []) as unknown as Row[]).map(toItem);
}

export type ReturnCandidate = {
  client_id: string;
  name: string;
  phone: string;
  last_visit: string;
  days_since: number;
};

/**
 * Quem está na hora de voltar.
 *
 * Vem de função no banco porque a pergunta cruza o último atendimento de cada
 * cliente, o prazo configurado e quem já tem horário marcado — três agrupamentos
 * que o app resolveria com várias idas e voltas.
 */
export async function listDueForReturn(): Promise<ReturnCandidate[]> {
  const { data, error } = await supabase.rpc('clients_due_for_return');

  if (error) throw new Error(error.message);
  return (data ?? []) as ReturnCandidate[];
}

/**
 * Muda o estado do atendimento.
 *
 * Cancelar libera o horário na hora: a trava de sobreposição só considera
 * pendente e confirmado, então o espaço volta a ser oferecido sozinho.
 */
export async function setStatus(id: string, status: AppointmentStatus): Promise<void> {
  const { error } = await supabase.from('appointments').update({ status }).eq('id', id);
  if (error) throw new Error(error.message);
}
