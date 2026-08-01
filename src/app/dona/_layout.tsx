/**
 * Porta de entrada da área de gestão.
 *
 * O critério é `isOwner`, não "tem sessão". Uma conta criada por fora no
 * Supabase autentica normalmente, mas não corresponde a nenhuma profissional
 * — e para essa conta esta área permanece fechada (DT-014).
 */

import { Redirect, Stack } from 'expo-router';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/app-text';
import { Button } from '@/components/button';
import { Spacing } from '@/constants/theme';
import { useAuth } from '@/hooks/use-auth';
import { useTheme } from '@/hooks/use-theme';

export default function OwnerLayout() {
  const { colors } = useTheme();
  const { session, isOwner, loading, signOut } = useAuth();

  if (loading) {
    return (
      <View style={[styles.centered, { backgroundColor: colors.background }]}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  if (!session) {
    return <Redirect href="/entrar" />;
  }

  // Autenticada, porém sem vínculo com nenhuma profissional. Não é um erro do
  // app: é a proteção funcionando.
  if (!isOwner) {
    return (
      <View style={[styles.centered, { backgroundColor: colors.background }]}>
        <View style={styles.message}>
          <AppText variant="heading">Esta conta não tem acesso</AppText>
          <AppText variant="body" color="textSecondary" style={styles.spaced}>
            O login funcionou, mas esta conta não está vinculada a nenhuma profissional do salão.
            Entre com a conta da administradora.
          </AppText>
          <Button label="Sair" variant="secondary" onPress={signOut} />
        </View>
      </View>
    );
  }

  return <Stack screenOptions={{ headerShown: false }} />;
}

const styles = StyleSheet.create({
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.three,
  },
  message: {
    maxWidth: 420,
  },
  spaced: {
    marginVertical: Spacing.three,
  },
});
