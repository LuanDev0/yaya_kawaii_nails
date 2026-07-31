/** Superfície com borda e canto arredondado. Base das listas e formulários. */

import { View, type ViewProps } from 'react-native';

import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export function Card({ style, ...rest }: ViewProps) {
  const { colors } = useTheme();

  return (
    <View
      style={[
        {
          backgroundColor: colors.surface,
          borderColor: colors.border,
          borderWidth: 1,
          borderRadius: Radius.medium,
          padding: Spacing.three,
        },
        style,
      ]}
      {...rest}
    />
  );
}
