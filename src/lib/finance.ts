/**
 * Faturamento.
 *
 * Conta só o que ela concluiu. Atendimento confirmado cuja hora passou não
 * entra: pode ter sido furo que ela ainda não cancelou, e faturamento que
 * conta dinheiro que não entrou é pior que faturamento nenhum.
 *
 * A soma é feita aqui e não no banco. É um salão de uma profissional — algumas
 * dezenas de atendimentos por mês — e uma função SQL a mais seria mais uma
 * coisa a migrar e versionar para responder o que cabe num laço.
 */

import { dayAfterInstant, dayStartInstant, type ISODate } from '@/lib/calendar';
import { type PaymentMethod } from '@/lib/payment';
import { supabase } from '@/lib/supabase';

export type PaymentTotal = { method: PaymentMethod | null; total_cents: number; count: number };
export type NamedTotal = { key: string; name: string; total_cents: number; count: number };

export type Unpaid = {
  id: string;
  client_name: string;
  starts_at: string;
  price_cents: number;
};

export type Finance = {
  total_cents: number;
  discount_cents: number;
  count: number;
  by_payment: PaymentTotal[];
  by_service: NamedTotal[];
  by_client: NamedTotal[];
  /** Concluídos sem forma de pagamento anotada, para ela completar. */
  missing_payment: Unpaid[];
};

type Row = {
  id: string;
  starts_at: string;
  price_cents: number;
  discount_cents: number;
  payment_method: PaymentMethod | null;
  clients: { id: string; name: string } | null;
  appointment_services:
    | { price_cents: number; services: { name: string } | null }[]
    | null;
};

const SELECT =
  'id, starts_at, price_cents, discount_cents, payment_method, clients(id, name), appointment_services(price_cents, services(name))';

function accumulate(into: Map<string, NamedTotal>, key: string, name: string, cents: number) {
  const found = into.get(key);

  if (found) {
    found.total_cents += cents;
    found.count += 1;
    return;
  }

  into.set(key, { key, name, total_cents: cents, count: 1 });
}

const byTotalDesc = (a: NamedTotal, b: NamedTotal) => b.total_cents - a.total_cents;

export async function loadFinance(from: ISODate, to: ISODate): Promise<Finance> {
  const { data, error } = await supabase
    .from('appointments')
    .select(SELECT)
    .eq('status', 'concluido')
    // A borda do dia vem de `calendar.ts`, onde dá para conferir fora do app:
    // meia-noite local, não do servidor.
    .gte('starts_at', dayStartInstant(from))
    .lt('starts_at', dayAfterInstant(to))
    .order('starts_at');

  if (error) throw new Error(error.message);

  const rows = (data ?? []) as unknown as Row[];

  const payments = new Map<string, PaymentTotal>();
  const services = new Map<string, NamedTotal>();
  const clients = new Map<string, NamedTotal>();
  const missing: Unpaid[] = [];

  let total = 0;
  let discount = 0;

  for (const row of rows) {
    total += row.price_cents;
    discount += row.discount_cents;

    const paymentKey = row.payment_method ?? 'sem';
    const payment = payments.get(paymentKey);

    if (payment) {
      payment.total_cents += row.price_cents;
      payment.count += 1;
    } else {
      payments.set(paymentKey, {
        method: row.payment_method,
        total_cents: row.price_cents,
        count: 1,
      });
    }

    if (row.clients) {
      accumulate(clients, row.clients.id, row.clients.name, row.price_cents);
    }

    // O preço de cada serviço foi congelado na marcação e a soma deles é o
    // total do atendimento — então dividir por serviço não é estimativa.
    for (const link of row.appointment_services ?? []) {
      const name = link.services?.name;
      if (name) accumulate(services, name, name, link.price_cents);
    }

    if (!row.payment_method) {
      missing.push({
        id: row.id,
        client_name: row.clients?.name ?? 'Cliente removida',
        starts_at: row.starts_at,
        price_cents: row.price_cents,
      });
    }
  }

  return {
    total_cents: total,
    discount_cents: discount,
    count: rows.length,
    // "Não anotado" por último: é pendência, não forma de pagamento.
    by_payment: [...payments.values()].sort((a, b) =>
      a.method === null ? 1 : b.method === null ? -1 : b.total_cents - a.total_cents,
    ),
    by_service: [...services.values()].sort(byTotalDesc),
    by_client: [...clients.values()].sort(byTotalDesc),
    missing_payment: missing,
  };
}

export async function setPaymentMethod(id: string, method: PaymentMethod): Promise<void> {
  const { error } = await supabase
    .from('appointments')
    .update({ payment_method: method })
    .eq('id', id);

  if (error) throw new Error(error.message);
}
