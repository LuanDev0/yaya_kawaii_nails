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

export async function listClients(): Promise<Client[]> {
  const { data, error } = await supabase
    .from('clients')
    .select('id, name, phone')
    .order('name');

  if (error) throw new Error(error.message);
  return (data ?? []) as Client[];
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
