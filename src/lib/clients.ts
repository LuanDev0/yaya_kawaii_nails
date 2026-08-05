/**
 * Clientes. Só a dona enxerga — a política do banco fecha esta tabela para a
 * chave pública, e não existe busca por telefone do lado da cliente (DT-004).
 */

import { supabase } from '@/lib/supabase';

export type Client = {
  id: string;
  name: string;
  phone: string;
};

export type ClientDetails = Client & {
  birth_date: string | null;
  preferences: string | null;
  notes: string | null;
};

/** Um atendimento no histórico dela. */
export type ClientVisit = {
  id: string;
  starts_at: string;
  status: string;
  price_cents: number;
  services: string[];
};

export async function listClients(): Promise<Client[]> {
  const { data, error } = await supabase
    .from('clients')
    .select('id, name, phone')
    .order('name');

  if (error) throw new Error(error.message);
  return (data ?? []) as Client[];
}

export async function getClient(id: string): Promise<ClientDetails | null> {
  const { data, error } = await supabase
    .from('clients')
    .select('id, name, phone, birth_date, preferences, notes')
    .eq('id', id)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return (data as ClientDetails) ?? null;
}

export async function updateClient(
  id: string,
  patch: Partial<Pick<ClientDetails, 'name' | 'birth_date' | 'preferences' | 'notes'>>,
): Promise<void> {
  const { error } = await supabase.from('clients').update(patch).eq('id', id);
  if (error) throw new Error(error.message);
}

/**
 * O histórico dela, do mais recente para o mais antigo.
 *
 * Traz cancelados também: saber que alguém desmarcou três vezes é informação,
 * e esconder isso deixaria a lista contando meia verdade.
 */
export async function listVisits(clientId: string): Promise<ClientVisit[]> {
  const { data, error } = await supabase
    .from('appointments')
    .select('id, starts_at, status, price_cents, appointment_services(services(name))')
    .eq('client_id', clientId)
    .order('starts_at', { ascending: false });

  if (error) throw new Error(error.message);

  type Row = {
    id: string;
    starts_at: string;
    status: string;
    price_cents: number;
    appointment_services: { services: { name: string } | null }[] | null;
  };

  return ((data ?? []) as unknown as Row[]).map((row) => ({
    id: row.id,
    starts_at: row.starts_at,
    status: row.status,
    price_cents: row.price_cents,
    services: (row.appointment_services ?? [])
      .map((link) => link.services?.name)
      .filter((name): name is string => Boolean(name)),
  }));
}

/** "11988887777" vira "(11) 98888-7777". O banco guarda só dígitos. */
export function formatPhone(phone: string): string {
  const digits = phone.replace(/\D/g, '');

  if (digits.length === 11) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
  }
  if (digits.length === 10) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  }

  return phone;
}
