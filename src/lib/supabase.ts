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

/**
 * Se a configuração chegou.
 *
 * Antes isto era um `throw` aqui em cima. Funcionava no desenvolvimento, onde
 * o erro aparece na tela — e era péssimo no aplicativo instalado, onde não há
 * tela de erro: o Android só fechava o app, sem a pessoa ver mensagem nenhuma
 * nem ter como descobrir o motivo.
 *
 * Agora o app abre e explica. Quem checa é o layout raiz.
 */
export const isSupabaseConfigured = Boolean(url && anonKey);

// Endereço inválido de propósito quando falta configuração: o cliente é criado
// para nada quebrar na importação, mas nenhuma chamada vai a lugar nenhum.
export const supabase = createClient(url ?? 'https://sem-configuracao.invalid', anonKey ?? 'sem-chave', {
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

