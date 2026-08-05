/** Lista de clientes. A ficha de cada uma fica em dona/cliente/[id]. */

import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppText } from '@/components/app-text';
import { Card } from '@/components/card';
import { ScreenHeader } from '@/components/screen-header';
import { TextField } from '@/components/text-field';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { formatPhone, listClients, type Client } from '@/lib/clients';

export default function ClientsScreen() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const [clients, setClients] = useState<Client[] | null>(null);
  const [search, setSearch] = useState('');
  const [error, setError] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      let active = true;

      listClients()
        .then((list) => active && setClients(list))
        .catch((cause: Error) => active && setError(cause.message));

      return () => {
        active = false;
      };
    }, []),
  );

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return clients ?? [];

    // Busca por nome ou por telefone. Digitar "9999" precisa achar, então o
    // telefone é comparado só em dígitos — do jeito que está guardado.
    const digits = term.replace(/\D/g, '');

    return (clients ?? []).filter(
      (client) =>
        client.name.toLowerCase().includes(term) ||
        (digits.length > 0 && client.phone.includes(digits)),
    );
  }, [clients, search]);

  return (
    <ScrollView
      style={{ backgroundColor: colors.background }}
      contentContainerStyle={[
        styles.content,
        { paddingTop: insets.top + Spacing.three, paddingBottom: insets.bottom + Spacing.five },
      ]}
      keyboardShouldPersistTaps="handled">
      <View style={styles.inner}>
        <ScreenHeader
          title="Clientes"
          subtitle="Cadastradas sozinhas quando agendam pela primeira vez."
        />

        {error ? (
          <Card style={styles.errorCard}>
            <AppText variant="support" color="textAccent">
              {error}
            </AppText>
          </Card>
        ) : null}

        {clients && clients.length > 3 ? (
          <TextField
            label="Buscar"
            value={search}
            onChangeText={setSearch}
            placeholder="Nome ou telefone"
          />
        ) : null}

        {clients === null ? (
          <ActivityIndicator color={colors.primary} />
        ) : clients.length === 0 ? (
          <Card>
            <AppText variant="body" color="textSecondary">
              Nenhuma cliente ainda. Elas entram sozinhas na primeira vez que agendam — ou quando
              você lança um agendamento por elas.
            </AppText>
          </Card>
        ) : filtered.length === 0 ? (
          <Card>
            <AppText variant="body" color="textSecondary">
              Nenhuma cliente com esse nome ou telefone.
            </AppText>
          </Card>
        ) : (
          <Card>
            {filtered.map((client, index) => (
              <Pressable
                key={client.id}
                accessibilityRole="button"
                accessibilityLabel={`Ficha de ${client.name}`}
                onPress={() => router.push(`/dona/cliente/${client.id}`)}
                style={({ pressed }) => [
                  styles.row,
                  index > 0 && { borderTopWidth: 1, borderTopColor: colors.border },
                  pressed && { opacity: 0.6 },
                ]}>
                <View style={styles.grow}>
                  <AppText variant="bodyBold">{client.name}</AppText>
                  <AppText variant="support" color="textSecondary">
                    {formatPhone(client.phone)}
                  </AppText>
                </View>
                <AppText variant="bodyBold" color="textAccent">
                  ›
                </AppText>
              </Pressable>
            ))}
          </Card>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: Spacing.three },
  inner: { width: '100%', maxWidth: MaxContentWidth, alignSelf: 'center' },
  errorCard: { marginBottom: Spacing.three },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.three,
    gap: Spacing.two,
  },
  grow: { flex: 1 },
});
