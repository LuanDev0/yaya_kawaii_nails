/** Lista de serviços. Cadastro e edição ficam em dona/servico/[id]. */

import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppText } from '@/components/app-text';
import { Button } from '@/components/button';
import { Card } from '@/components/card';
import { ScreenHeader } from '@/components/screen-header';
import { Toggle } from '@/components/toggle';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { formatDuration, formatPrice } from '@/lib/format';
import { formatISODate, todayISO } from '@/lib/calendar';
import { discountState, finalPriceCents, hasDiscount } from '@/lib/pricing';
import { listAllServices, reorderServices, setServiceActive, type Service } from '@/lib/services';

export default function ServicesScreen() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const [services, setServices] = useState<Service[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  // As funções de preço não consultam o relógio por dentro: a data entra por
  // parâmetro, para poderem ser testadas em qualquer dia.
  const today = todayISO();

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
      current?.map((item) => (item.id === service.id ? { ...item, active: !item.active } : item)) ??
        null,
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

  async function move(index: number, direction: -1 | 1) {
    if (!services) return;

    const target = index + direction;
    if (target < 0 || target >= services.length) return;

    const reordered = [...services];
    [reordered[index], reordered[target]] = [reordered[target], reordered[index]];

    const previous = services;
    setServices(reordered);

    try {
      await reorderServices(reordered.map((item) => item.id));
    } catch (cause) {
      setServices(previous);
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
          subtitle="Toque num serviço para editar. As setas mudam a ordem em que a cliente vê a lista."
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
                <View style={styles.arrows}>
                  <Arrow
                    label={`Subir ${service.name}`}
                    glyph="▲"
                    disabled={index === 0}
                    onPress={() => move(index, -1)}
                  />
                  <Arrow
                    label={`Descer ${service.name}`}
                    glyph="▼"
                    disabled={index === services.length - 1}
                    onPress={() => move(index, 1)}
                  />
                </View>

                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`Editar ${service.name}`}
                  onPress={() => router.push(`/dona/servico/${service.id}`)}
                  style={({ pressed }) => [styles.rowText, pressed && { opacity: 0.6 }]}>
                  <View style={styles.rowTitle}>
                    <AppText
                      variant="bodyBold"
                      color={service.active ? 'textPrimary' : 'textSecondary'}
                      style={styles.rowName}>
                      {service.name}
                    </AppText>
                    <AppText variant="bodyBold" color="textAccent">
                      ›
                    </AppText>
                  </View>

                  <View style={styles.priceLine}>
                    {hasDiscount(service, today) ? (
                      <>
                        <AppText variant="support" color="textSecondary" style={styles.struck}>
                          {formatPrice(service.price_cents)}
                        </AppText>
                        <AppText variant="label" color="textAccent">
                          {formatPrice(finalPriceCents(service, today))}
                        </AppText>
                      </>
                    ) : (
                      <AppText variant="support" color="textSecondary">
                        {formatPrice(service.price_cents)}
                      </AppText>
                    )}

                    <AppText variant="support" color="textSecondary">
                      · {formatDuration(service.duration_minutes)}
                      {service.buffer_minutes > 0 ? ` + ${service.buffer_minutes}min` : ''}
                      {service.active ? '' : ' · desativado'}
                    </AppText>
                  </View>

                  {discountState(service, today) === 'agendada' ? (
                    <AppText variant="label" color="textAccent">
                      Promoção começa em {formatISODate(service.discount_starts_on!)}
                    </AppText>
                  ) : discountState(service, today) === 'encerrada' ? (
                    <AppText variant="label" color="textSecondary">
                      Promoção encerrada em {formatISODate(service.discount_ends_on!)}
                    </AppText>
                  ) : null}
                </Pressable>

                <Toggle
                  value={service.active}
                  onValueChange={() => toggle(service)}
                  accessibilityLabel={`Ativar ${service.name}`}
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

function Arrow({
  label,
  glyph,
  disabled,
  onPress,
}: {
  label: string;
  glyph: string;
  disabled: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [styles.arrow, { opacity: disabled ? 0.2 : pressed ? 0.5 : 1 }]}>
      <AppText variant="label" color="textAccent">
        {glyph}
      </AppText>
    </Pressable>
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
  arrows: { alignItems: 'center' },
  arrow: { paddingHorizontal: Spacing.one, paddingVertical: Spacing.half },
  rowText: { flex: 1 },
  rowTitle: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  rowName: { flex: 1, paddingRight: Spacing.two },
  priceLine: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: Spacing.one },
  struck: { textDecorationLine: 'line-through' },
  footer: { marginTop: Spacing.four },
});
