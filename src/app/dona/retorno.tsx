/**
 * Quem está na hora de voltar.
 *
 * Cliente que some não avisa que sumiu — ela simplesmente para de aparecer, e
 * quando alguém percebe já faz meses. Esta lista é o que transforma isso numa
 * conversa de trinta segundos.
 */

import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Linking, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppText } from '@/components/app-text';
import { Card } from '@/components/card';
import { ScreenHeader } from '@/components/screen-header';
import { MaxContentWidth, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { listDueForReturn, type ReturnCandidate } from '@/lib/agenda';
import { formatPhone } from '@/lib/clients';
import { buildReturnMessage, whatsAppUrl } from '@/lib/whatsapp';

export default function ReturnListScreen() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();

  const [list, setList] = useState<ReturnCandidate[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      let active = true;

      listDueForReturn()
        .then((rows) => active && setList(rows))
        .catch((cause: Error) => active && setError(cause.message));

      return () => {
        active = false;
      };
    }, []),
  );

  return (
    <ScrollView
      style={{ backgroundColor: colors.background }}
      contentContainerStyle={[
        styles.content,
        { paddingTop: insets.top + Spacing.three, paddingBottom: insets.bottom + Spacing.five },
      ]}>
      <View style={styles.inner}>
        <ScreenHeader
          title="Hora de voltar"
          subtitle="Clientes que passaram do prazo de manutenção e ainda não remarcaram."
        />

        {error ? (
          <Card style={styles.errorCard}>
            <AppText variant="support" color="textAccent">
              {error}
            </AppText>
          </Card>
        ) : null}

        {list === null ? (
          <ActivityIndicator color={colors.primary} />
        ) : list.length === 0 ? (
          <Card>
            <AppText variant="body" color="textSecondary">
              Ninguém atrasado por enquanto. Quem se atendeu já remarcou ou ainda está dentro do
              prazo.
            </AppText>
          </Card>
        ) : (
          <Card>
            {list.map((person, index) => (
              <View
                key={person.client_id}
                style={[
                  styles.row,
                  index > 0 && { borderTopWidth: 1, borderTopColor: colors.border },
                ]}>
                <View style={styles.grow}>
                  <AppText variant="bodyBold">{person.name}</AppText>
                  <AppText variant="support" color="textSecondary">
                    {formatPhone(person.phone)}
                  </AppText>
                  <AppText variant="support" color="textAccent" style={styles.since}>
                    {person.days_since} dias desde o último atendimento
                  </AppText>
                </View>

                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`Chamar ${person.name} no WhatsApp`}
                  onPress={() =>
                    Linking.openURL(
                      whatsAppUrl(person.phone, buildReturnMessage(person.name, person.days_since)),
                    )
                  }
                  style={({ pressed }) => [
                    styles.action,
                    { backgroundColor: colors.primary, opacity: pressed ? 0.7 : 1 },
                  ]}>
                  <AppText variant="label" color="onPrimary">
                    Chamar
                  </AppText>
                </Pressable>
              </View>
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
    gap: Spacing.three,
    paddingVertical: Spacing.three,
  },
  grow: { flex: 1 },
  since: { marginTop: Spacing.one },
  action: {
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    borderRadius: Radius.pill,
  },
});
