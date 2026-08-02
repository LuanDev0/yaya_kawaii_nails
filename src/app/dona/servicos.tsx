/** Lista de serviços. Cadastro e edição ficam em dona/servico/[id]. */

import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Switch, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppText } from '@/components/app-text';
import { Button } from '@/components/button';
import { Card } from '@/components/card';
import { ScreenHeader } from '@/components/screen-header';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { formatDuration, formatPrice } from '@/lib/format';
import { listAllServices, setServiceActive, type Service } from '@/lib/services';

export default function ServicesScreen() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const [services, setServices] = useState<Service[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Recarrega ao voltar do formulário, senão a lista mostraria dado velho.
  useFocusEffect(
    useCallback(() => {
      let active = true;

      listAllServices()
        .then((list) => active && setServices(list))
        .catch((cause: Error) => active && setError(cause.message));

      return () => {
        active = false;
      };
    }, []),
  );

  async function toggle(service: Service) {
    // Atualiza a tela primeiro para o switch responder na hora, e desfaz se o
    // banco recusar — esperar a ida e volta faz o controle parecer travado.
    setServices((current) =>
      current?.map((item) =>
        item.id === service.id ? { ...item, active: !item.active } : item,
      ) ?? null,
    );

    try {
      await setServiceActive(service.id, !service.active);
    } catch (cause) {
      setServices((current) =>
        current?.map((item) =>
          item.id === service.id ? { ...item, active: service.active } : item,
        ) ?? null,
      );
      setError((cause as Error).message);
    }
  }

  return (
    <ScrollView
      style={{ backgroundColor: colors.background }}
      contentContainerStyle={[
        styles.content,
        { paddingTop: insets.top + Spacing.three, paddingBottom: insets.bottom + Spacing.five },
      ]}>
      <View style={styles.inner}>
        <ScreenHeader
          title="Serviços"
          subtitle="Desativar tira do cardápio da cliente sem apagar o histórico."
        />

        {error ? (
          <Card style={styles.errorCard}>
            <AppText variant="support" color="textAccent">
              {error}
            </AppText>
          </Card>
        ) : null}

        {services === null ? (
          <ActivityIndicator color={colors.primary} />
        ) : services.length === 0 ? (
          <Card>
            <AppText variant="body" color="textSecondary">
              Nenhum serviço cadastrado ainda.
            </AppText>
          </Card>
        ) : (
          <Card>
            {services.map((service, index) => (
              <View
                key={service.id}
                style={[
                  styles.row,
                  index > 0 && { borderTopWidth: 1, borderTopColor: colors.border },
                ]}>
                <Pressable
                  accessibilityRole="button"
                  onPress={() => router.push(`/dona/servico/${service.id}`)}
                  style={({ pressed }) => [styles.rowText, pressed && { opacity: 0.6 }]}>
                  <AppText variant="bodyBold" color={service.active ? 'textPrimary' : 'textSecondary'}>
                    {service.name}
                  </AppText>
                  <AppText variant="support" color="textSecondary">
                    {formatPrice(service.price_cents)} · {formatDuration(service.duration_minutes)}
                    {service.buffer_minutes > 0 ? ` + ${service.buffer_minutes}min de arrumação` : ''}
                    {service.active ? '' : ' · desativado'}
                  </AppText>
                </Pressable>

                <Switch
                  value={service.active}
                  onValueChange={() => toggle(service)}
                  accessibilityLabel={`Ativar ${service.name}`}
                  trackColor={{ true: colors.primary, false: colors.border }}
                  thumbColor={colors.surface}
                />
              </View>
            ))}
          </Card>
        )}

        <View style={styles.footer}>
          <Button label="Novo serviço" onPress={() => router.push('/dona/servico/novo')} />
        </View>
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
    justifyContent: 'space-between',
    paddingVertical: Spacing.three,
    gap: Spacing.three,
  },
  rowText: { flex: 1 },
  footer: { marginTop: Spacing.four },
});
