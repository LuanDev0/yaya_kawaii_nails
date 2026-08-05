/**
 * Troca entre as duas coisas que a dona faz no app: configurar o salão e
 * lançar agendamento por quem combinou por fora.
 *
 * Dois botões em vez de lista suspensa: com duas opções, a lista esconde
 * metade das escolhas atrás de um toque a mais sem economizar espaço.
 */

import { useRouter, usePathname } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/app-text';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

const MODES = [
  { href: '/dona', label: 'Agenda' },
  { href: '/dona/agendar', label: 'Agendar' },
  { href: '/dona/configuracao', label: 'Configurar' },
] as const;

export function OwnerModeSwitch() {
  const { colors } = useTheme();
  const router = useRouter();
  const pathname = usePathname();

  return (
    <View style={[styles.wrapper, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      {MODES.map((mode) => {
        // Compara o caminho inteiro: "/dona" não pode ficar aceso enquanto a
        // pessoa está em "/dona/agendar".
        const active = pathname === mode.href;

        return (
          <Pressable
            key={mode.href}
            accessibilityRole="button"
            accessibilityState={{ selected: active }}
            onPress={() => router.replace(mode.href)}
            style={[
              styles.option,
              active && { backgroundColor: colors.primary, borderRadius: Radius.pill },
            ]}>
            <AppText variant="label" color={active ? 'onPrimary' : 'textSecondary'}>
              {mode.label}
            </AppText>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    flexDirection: 'row',
    padding: Spacing.one,
    borderWidth: 1,
    borderRadius: Radius.pill,
    marginBottom: Spacing.four,
  },
  option: { flex: 1, alignItems: 'center', paddingVertical: Spacing.two },
});
