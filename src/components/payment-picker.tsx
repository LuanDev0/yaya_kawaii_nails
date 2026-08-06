/**
 * "Pagou como?" — as três formas lado a lado.
 *
 * Aparece em dois lugares: quando ela conclui o atendimento na agenda, e no
 * faturamento, para completar o que ficou sem anotação. Mesmo componente nos
 * dois porque é a mesma pergunta.
 */

import { Pressable, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/app-text';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { PAYMENT_METHODS, type PaymentMethod } from '@/lib/payment';

export function PaymentPicker({
  onPick,
  onSkip,
  skipLabel = 'Anoto depois',
  disabled,
}: {
  onPick: (method: PaymentMethod) => void;
  /** Sem isto o botão de pular não aparece — no faturamento ele não faz sentido. */
  onSkip?: () => void;
  skipLabel?: string;
  disabled?: boolean;
}) {
  const { colors } = useTheme();

  return (
    <View style={styles.row}>
      {PAYMENT_METHODS.map((method) => (
        <Pressable
          key={method.value}
          accessibilityRole="button"
          accessibilityLabel={`Pagou com ${method.label}`}
          disabled={disabled}
          onPress={() => onPick(method.value)}
          style={({ pressed }) => [
            styles.pill,
            {
              backgroundColor: colors.primary,
              borderColor: colors.primary,
              opacity: disabled ? 0.4 : pressed ? 0.7 : 1,
            },
          ]}>
          <AppText variant="label" color="onPrimary">
            {method.label}
          </AppText>
        </Pressable>
      ))}

      {onSkip ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={skipLabel}
          disabled={disabled}
          onPress={onSkip}
          style={({ pressed }) => [
            styles.pill,
            { borderColor: colors.border, opacity: disabled ? 0.4 : pressed ? 0.7 : 1 },
          ]}>
          <AppText variant="label" color="textSecondary">
            {skipLabel}
          </AppText>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two },
  pill: {
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    borderRadius: Radius.pill,
    borderWidth: 1,
  },
});
