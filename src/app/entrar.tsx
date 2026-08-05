/** Login da dona. A cliente nunca passa por aqui — ela agenda sem conta. */

import { Redirect } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppText } from '@/components/app-text';
import { Button } from '@/components/button';
import { TextField } from '@/components/text-field';
import { Spacing } from '@/constants/theme';
import { useAuth } from '@/hooks/use-auth';
import { useTheme } from '@/hooks/use-theme';

export default function SignInScreen() {
  const { colors } = useTheme();
  const { signIn, isOwner, loading } = useAuth();
  const insets = useSafeAreaInsets();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  if (!loading && isOwner) {
    return <Redirect href="/dona" />;
  }

  async function handleSubmit() {
    if (!email.trim() || !password) {
      setError('Preencha o email e a senha.');
      return;
    }

    setSubmitting(true);
    setError(null);

    const failure = await signIn(email, password);

    setSubmitting(false);
    if (failure) setError(failure);
    // Sem sucesso explícito: o AuthProvider atualiza isOwner e o Redirect
    // acima leva para /dona sozinho.
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: colors.background }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingTop: insets.top + Spacing.six, paddingBottom: insets.bottom + Spacing.four },
        ]}
        keyboardShouldPersistTaps="handled">
        <View style={styles.inner}>
          <AppText variant="title">Yaya Kawaii Nails</AppText>
          <AppText variant="body" color="textSecondary" style={styles.subtitle}>
            Entre para gerenciar a agenda do salão.
          </AppText>

          <TextField
            label="Email"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            autoComplete="email"
            keyboardType="email-address"
            inputMode="email"
            placeholder="voce@exemplo.com"
            editable={!submitting}
          />

          <TextField
            label="Senha"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            autoCapitalize="none"
            autoComplete="current-password"
            onSubmitEditing={handleSubmit}
            returnKeyType="go"
            editable={!submitting}
            error={error}
          />

          <Button
            label={submitting ? 'Entrando...' : 'Entrar'}
            onPress={handleSubmit}
            disabled={submitting}
          />

          <AppText variant="support" color="textSecondary" style={styles.note}>
            Só quem administra o salão precisa entrar. Suas clientes agendam pelo link, sem criar
            conta.
          </AppText>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  content: {
    flexGrow: 1,
    paddingHorizontal: Spacing.three,
  },
  inner: {
    width: '100%',
    maxWidth: 420,
    alignSelf: 'center',
  },
  subtitle: {
    marginTop: Spacing.one,
    marginBottom: Spacing.five,
  },
  note: {
    marginTop: Spacing.four,
    textAlign: 'center',
  },
});
