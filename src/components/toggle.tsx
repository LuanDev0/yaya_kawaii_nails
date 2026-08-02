/**
 * Interruptor de liga/desliga na paleta da marca.
 *
 * Substitui o Switch do React Native, que ignora as cores informadas em
 * algumas plataformas e insiste no verde do sistema — destoando de um app
 * inteiro construído em laranja e lavanda.
 */

import { useEffect, useRef } from 'react';
import { Animated, Pressable, StyleSheet } from 'react-native';

import { useTheme } from '@/hooks/use-theme';

const TRACK_WIDTH = 50;
const TRACK_HEIGHT = 30;
const THUMB_SIZE = 24;
const PADDING = (TRACK_HEIGHT - THUMB_SIZE) / 2;

type ToggleProps = {
  value: boolean;
  onValueChange: (value: boolean) => void;
  accessibilityLabel: string;
  disabled?: boolean;
};

export function Toggle({ value, onValueChange, accessibilityLabel, disabled }: ToggleProps) {
  const { colors } = useTheme();
  const progress = useRef(new Animated.Value(value ? 1 : 0)).current;

  useEffect(() => {
    Animated.timing(progress, {
      toValue: value ? 1 : 0,
      duration: 160,
      // Interpolação de cor não roda na thread nativa.
      useNativeDriver: false,
    }).start();
  }, [value, progress]);

  return (
    <Pressable
      accessibilityRole="switch"
      // aria-checked explícito: o React Native Web não traduz
      // accessibilityState.checked para o atributo do navegador, e sem ele um
      // leitor de tela anuncia "interruptor" sem dizer se está ligado.
      aria-checked={value}
      accessibilityState={{ checked: value, disabled }}
      accessibilityLabel={accessibilityLabel}
      disabled={disabled}
      onPress={() => onValueChange(!value)}
      style={{ opacity: disabled ? 0.4 : 1 }}>
      <Animated.View
        style={[
          styles.track,
          {
            backgroundColor: progress.interpolate({
              inputRange: [0, 1],
              outputRange: [colors.border, colors.primary],
            }),
          },
        ]}>
        <Animated.View
          style={[
            styles.thumb,
            {
              backgroundColor: colors.surface,
              transform: [
                {
                  translateX: progress.interpolate({
                    inputRange: [0, 1],
                    outputRange: [PADDING, TRACK_WIDTH - THUMB_SIZE - PADDING],
                  }),
                },
              ],
            },
          ]}
        />
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  track: {
    width: TRACK_WIDTH,
    height: TRACK_HEIGHT,
    borderRadius: TRACK_HEIGHT / 2,
    justifyContent: 'center',
  },
  thumb: {
    width: THUMB_SIZE,
    height: THUMB_SIZE,
    borderRadius: THUMB_SIZE / 2,
  },
});
