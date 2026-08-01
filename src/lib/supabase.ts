/**
 * Conexão com o Supabase.
 *
 * Não usamos a autenticação do Supabase: a cliente se identifica por nome e
 * telefone, sem senha (DT-004). Por isso sessão e refresh de token ficam
 * desligados — ligados, o cliente tentaria persistir uma sessão que não existe.
 */

import { createClient } from '@supabase/supabase-js';

const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
const anonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!url || !anonKey) {
  // Erro explícito na hora de abrir o app é bem melhor que uma tela em branco
  // com "undefined" no console meia hora depois.
  throw new Error(
    'Faltam as variáveis do Supabase. Copie .env.example para .env e preencha ' +
      'EXPO_PUBLIC_SUPABASE_URL e EXPO_PUBLIC_SUPABASE_ANON_KEY. ' +
      'Depois reinicie o servidor: as variáveis só são lidas na inicialização.',
  );
}

export const supabase = createClient(url, anonKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
});

/** Espelha a tabela `services`. Preço em centavos — ver comentário na migration. */
export type Service = {
  id: string;
  name: string;
  price_cents: number;
  duration_minutes: number;
  active: boolean;
  sort_order: number;
};

/** Formata centavos como moeda: 12000 vira "R$ 120,00". */
export function formatPrice(cents: number): string {
  return (cents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

/** Formata duração em minutos: 150 vira "2h30". */
export function formatDuration(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;

  if (hours === 0) return `${rest}min`;
  if (rest === 0) return `${hours}h`;

  return `${hours}h${String(rest).padStart(2, '0')}`;
}
