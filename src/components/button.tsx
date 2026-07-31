/**
 * Botão do app.
 *
 * O primário é laranja vivo com texto escuro, não branco — branco sobre o
 * laranja da marca dá 3,1:1 de contraste e fica ilegível para quem tem baixa
 * visão. Ver DT-003 em docs/DECISOES.md.
 */

import { Pressable, type PressableProps, StyleSheet } from 'react-native';

import { Radius, Spacing, TextStyles } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { AppText } from '@/components/app-text';

type ButtonProps = Omit<PressableProps, 'children'> & {
  label: string;
  variant?: 'primary' | 'secondary';
};

export function Button({ label, variant = 'primary', style, disabled, ...rest }: ButtonProps) {
  const { colors } = useTheme();
  const isPrimary = variant === 'primary';

  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      style={(state) => [
        styles.base,
        {
          backgroundColor: isPrimary
            ? state.pressed
              ? colors.primaryPressed
              : colors.primary
            : 'transparent',
          borderColor: isPrimary ? 'transparent' : colors.border,
          opacity: disabled ? 0.5 : 1,
        },
        typeof style === 'function' ? style(state) : style,
      ]}
      {...rest}>
      <AppText variant="bodyBold" color={isPrimary ? 'onPrimary' : 'textPrimary'}>
        {label}
      </AppText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: 48,
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.two,
    borderRadius: Radius.pill,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
