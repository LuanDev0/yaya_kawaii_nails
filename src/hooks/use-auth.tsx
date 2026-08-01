/**
 * Estado de login da dona.
 *
 * Estar autenticado não basta para gerenciar o salão: o Supabase permite
 * cadastro aberto, então a conta precisa estar vinculada a uma profissional
 * (DT-014). Por isso este hook expõe `professional` — se vier null, a conta
 * autenticou mas não administra nada.
 */

import { type Session } from '@supabase/supabase-js';
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

import { supabase } from '@/lib/supabase';

export type Professional = {
  id: string;
  name: string;
};

type AuthContextValue = {
  session: Session | null;
  /** A profissional vinculada à conta. null = a conta não administra o salão. */
  professional: Professional | null;
  /** Atalho de leitura: `professional !== null`. */
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
  const [professional, setProfessional] = useState<Professional | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    /**
     * A política "dona ve as profissionais" usa is_owner(), então esta consulta
     * só devolve linha se o vínculo existir de verdade no banco. Ou seja: a
     * própria busca é a verificação, não é preciso um passo separado.
     */
    async function loadProfessional(current: Session | null) {
      if (!current) {
        if (active) setProfessional(null);
        return;
      }

      const { data } = await supabase
        .from('professionals')
        .select('id, name')
        .eq('auth_user_id', current.user.id)
        .maybeSingle();

      if (active) setProfessional((data as Professional) ?? null);
    }

    supabase.auth.getSession().then(async ({ data }) => {
      if (!active) return;

      setSession(data.session);
      await loadProfessional(data.session);

      if (active) setLoading(false);
    });

    const { data: subscription } = supabase.auth.onAuthStateChange(async (_event, next) => {
      if (!active) return;

      setSession(next);
      await loadProfessional(next);
    });

    return () => {
      active = false;
      subscription.subscription.unsubscribe();
    };
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      session,
      professional,
      isOwner: professional !== null,
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
    [session, professional, loading],
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
