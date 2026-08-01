/**
 * Conexão com o Supabase.
 *
 * A cliente não tem login: identifica-se por nome e telefone (DT-004). Já a
 * dona entra com email e senha para poder gerenciar (DT-014) — por isso a
 * sessão é persistida, e ela digita a senha uma vez só.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import { Platform } from 'react-native';

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
    // No navegador o Supabase já usa o localStorage sozinho; no celular
    // precisa de um armazenamento explícito, senão a sessão morre ao fechar.
    storage: Platform.OS === 'web' ? undefined : AsyncStorage,
    persistSession: true,
    autoRefreshToken: true,
    // Só usamos email e senha. Sem link mágico nem OAuth, não há token
    // chegando pela URL para o cliente vasculhar.
    detectSessionInUrl: false,
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
