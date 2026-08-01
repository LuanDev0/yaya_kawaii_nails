/**
 * Estado de login da dona.
 *
 * Estar autenticado não basta para gerenciar o salão: o Supabase permite
 * cadastro aberto, então a conta precisa estar vinculada a uma profissional
 * (DT-014). Por isso este hook expõe `isOwner` além de `session` — as telas
 * de gestão checam `isOwner`, nunca apenas "tem sessão".
 */

import { type Session } from '@supabase/supabase-js';
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

import { supabase } from '@/lib/supabase';

type AuthContextValue = {
  session: Session | null;
  /** A conta corresponde a uma profissional ativa. É isto que dá acesso. */
  isOwner: boolean;
  /** true enquanto a sessão guardada ainda está sendo lida. */
  loading: boolean;
  signIn: (email: string, password: string) => Promise<string | null>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

/** Traduz os erros do Supabase, que chegam em inglês e pouco explicativos. */
function translateError(message: string): string {
  if (/invalid login credentials/i.test(message)) {
    return 'Email ou senha incorretos.';
  }
  if (/email not confirmed/i.test(message)) {
    return 'Esta conta ainda não foi confirmada. No painel do Supabase, marque "Auto Confirm User".';
  }
  if (/network|fetch/i.test(message)) {
    return 'Não deu para falar com o servidor. Verifique sua conexão.';
  }
  return message;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [isOwner, setIsOwner] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    async function resolveOwner(current: Session | null) {
      if (!current) {
        if (active) setIsOwner(false);
        return;
      }

      const { data, error } = await supabase.rpc('is_owner');

      if (active) setIsOwner(!error && data === true);
    }

    // Sessão guardada de uma abertura anterior.
    supabase.auth.getSession().then(async ({ data }) => {
      if (!active) return;

      setSession(data.session);
      await resolveOwner(data.session);

      if (active) setLoading(false);
    });

    const { data: subscription } = supabase.auth.onAuthStateChange(async (_event, next) => {
      if (!active) return;

      setSession(next);
      await resolveOwner(next);
    });

    return () => {
      active = false;
      subscription.subscription.unsubscribe();
    };
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      session,
      isOwner,
      loading,
      async signIn(email, password) {
        const { error } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });

        return error ? translateError(error.message) : null;
      },
      async signOut() {
        await supabase.auth.signOut();
      },
    }),
    [session, isOwner, loading],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error('useAuth precisa ser usado dentro de <AuthProvider>.');
  }

  return context;
}
