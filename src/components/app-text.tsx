/**
 * Texto do app. Aplica a fonte e o tamanho certos por variante, para que
 * nenhuma tela precise saber que a Baloo 2 é dos títulos e a Nunito dos dados.
 */

import { Text, type TextProps } from 'react-native';

import { TextStyles, type TextVariant, type ThemeColor } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type AppTextProps = TextProps & {
  variant?: TextVariant;
  /** Token de cor do tema. Evita cor escrita à mão na tela. */
  color?: ThemeColor;
};

export function AppText({
  variant = 'body',
  color = 'textPrimary',
  style,
  ...rest
}: AppTextProps) {
  const { colors } = useTheme();

  return <Text style={[TextStyles[variant], { color: colors[color] }, style]} {...rest} />;
}
