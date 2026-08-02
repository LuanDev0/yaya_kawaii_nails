/**
 * Tema claro/escuro do app.
 *
 * Por padrão segue o sistema operacional, mas aceita override manual —
 * necessário para a tela de demonstração, onde a dona precisa conferir os
 * dois modos sem mexer nas configurações do celular.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

import { Colors, type ColorScheme, type ThemeColors } from '@/constants/theme';
// Não importe useColorScheme direto do react-native: no web o app é renderizado
// estaticamente no servidor, onde não existe modo escuro. Este hook devolve
// 'light' até a hidratação e reavalia no cliente, evitando a troca brusca.
import { useColorScheme as useSystemColorScheme } from '@/hooks/use-color-scheme';

/** 'system' acompanha o aparelho; 'light' e 'dark' forçam. */
export type ThemeMode = 'system' | 'light' | 'dark';

type ThemeContextValue = {
  colors: ThemeColors;
  scheme: ColorScheme;
  mode: ThemeMode;
  setMode: (mode: ThemeMode) => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

/** Fica no aparelho, não no banco: é preferência de quem está olhando a tela,
 *  e cada aparelho pode querer a sua. */
const STORAGE_KEY = 'yaya:tema';

function isThemeMode(value: unknown): value is ThemeMode {
  return value === 'system' || value === 'light' || value === 'dark';
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const systemScheme = useSystemColorScheme();
  const [mode, setModeState] = useState<ThemeMode>('system');

  useEffect(() => {
    let active = true;

    AsyncStorage.getItem(STORAGE_KEY)
      .then((saved) => {
        if (active && isThemeMode(saved)) setModeState(saved);
      })
      // Falha ao ler não é motivo para travar o app: segue no padrão do sistema.
      .catch(() => {});

    return () => {
      active = false;
    };
  }, []);

  const setMode = useCallback((next: ThemeMode) => {
    // Aplica na hora e grava depois: esperar a escrita faria o toque parecer
    // travado, e o pior caso de a gravação falhar é a escolha não sobreviver
    // ao fechamento do app.
    setModeState(next);
    AsyncStorage.setItem(STORAGE_KEY, next).catch(() => {});
  }, []);

  const value = useMemo<ThemeContextValue>(() => {
    const scheme: ColorScheme =
      mode === 'system' ? (systemScheme === 'dark' ? 'dark' : 'light') : mode;

    return { colors: Colors[scheme], scheme, mode, setMode };
  }, [mode, systemScheme]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  const context = useContext(ThemeContext);

  if (!context) {
    throw new Error('useTheme precisa ser usado dentro de <ThemeProvider>.');
  }

  return context;
}
