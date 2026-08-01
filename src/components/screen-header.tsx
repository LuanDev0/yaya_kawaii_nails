/** Cabeçalho com voltar. O Stack roda sem header próprio, para o visual
 *  ficar igual em celular e navegador. */

import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/app-text';
import { Spacing } from '@/constants/theme';

export function ScreenHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  const router = useRouter();

  return (
    <View style={styles.wrapper}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Voltar"
        onPress={() => (router.canGoBack() ? router.back() : router.replace('/dona'))}
        style={({ pressed }) => [styles.back, pressed && { opacity: 0.6 }]}>
        <AppText variant="bodyBold" color="textAccent">
          ‹ Voltar
        </AppText>
      </Pressable>

      <AppText variant="title">{title}</AppText>

      {subtitle ? (
        <AppText variant="support" color="textSecondary" style={styles.subtitle}>
          {subtitle}
        </AppText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { marginBottom: Spacing.four },
  back: { alignSelf: 'flex-start', paddingVertical: Spacing.two, marginBottom: Spacing.one },
  subtitle: { marginTop: Spacing.one },
});
