/**
 * A agenda da dona. Tela do dia a dia, por isso é a inicial da área dela.
 *
 * Duas listas: o que espera uma decisão dela, e o que vem pela frente.
 */

import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppText } from '@/components/app-text';
import { Card } from '@/components/card';
import { OwnerModeSwitch } from '@/components/owner-mode-switch';
import { MaxContentWidth, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { listPending, listUpcoming, setStatus, type AgendaItem } from '@/lib/agenda';
import { type AppointmentStatus } from '@/lib/booking';
import { formatPhone } from '@/lib/clients';
import { formatPrice } from '@/lib/format';

export default function AgendaScreen() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();

  const [pending, setPending] = useState<AgendaItem[] | null>(null);
  const [upcoming, setUpcoming] = useState<AgendaItem[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const reload = useCallback(async () => {
    try {
      const [p, u] = await Promise.all([listPending(), listUpcoming()]);
      setPending(p);
      setUpcoming(u);
    } catch (cause) {
      setError((cause as Error).message);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      reload();
    }, [reload]),
  );

  async function act(item: AgendaItem, status: AppointmentStatus) {
    setBusy(item.id);
    setError(null);

    try {
      await setStatus(item.id, status);
      await reload();
    } catch (cause) {
      setError((cause as Error).message);
    } finally {
      setBusy(null);
    }
  }

  const loading = pending === null || upcoming === null;

  return (
    <ScrollView
      style={{ backgroundColor: colors.background }}
      contentContainerStyle={[
        styles.content,
        { paddingTop: insets.top + Spacing.four, paddingBottom: insets.bottom + Spacing.five },
      ]}>
      <View style={styles.inner}>
        <OwnerModeSwitch />

        <AppText variant="title">Agenda</AppText>

        {error ? (
          <Card style={styles.errorCard}>
            <AppText variant="support" color="textAccent">
              {error}
            </AppText>
          </Card>
        ) : null}

        {loading ? (
          <ActivityIndicator color={colors.primary} style={styles.loader} />
        ) : (
          <>
            {pending.length > 0 ? (
              <>
                <AppText variant="label" color="textAccent" style={styles.section}>
                  PRECISAM DE VOCÊ
                </AppText>

                {pending.map((item) => (
                  <AppointmentCard
                    key={item.id}
                    item={item}
                    busy={busy === item.id}
                    onAct={act}
                    highlight
                  />
                ))}
              </>
            ) : null}

            <AppText variant="label" color="textSecondary" style={styles.section}>
              PRÓXIMOS
            </AppText>

            {upcoming.length === 0 ? (
              <Card>
                <AppText variant="body" color="textSecondary">
                  Nenhum atendimento marcado. Quando alguém agendar pelo link, aparece aqui.
                </AppText>
              </Card>
            ) : (
              upcoming.map((item) => (
                <AppointmentCard key={item.id} item={item} busy={busy === item.id} onAct={act} />
              ))
            )}
          </>
        )}
      </View>
    </ScrollView>
  );
}

function AppointmentCard({
  item,
  busy,
  onAct,
  highlight,
}: {
  item: AgendaItem;
  busy: boolean;
  onAct: (item: AgendaItem, status: AppointmentStatus) => void;
  highlight?: boolean;
}) {
  const { colors } = useTheme();

  const starts = new Date(item.starts_at);
  const ends = new Date(item.ends_at);
  const hora = (d: Date) => d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  const passou = starts < new Date();

  // Pendente espera aprovação; confirmado que já passou espera o fecho.
  const actions: { label: string; status: AppointmentStatus; primary?: boolean }[] =
    item.status === 'pendente'
      ? [
          { label: 'Aprovar', status: 'confirmado', primary: true },
          { label: 'Recusar', status: 'cancelado' },
        ]
      : passou
        ? [
            { label: 'Concluir', status: 'concluido', primary: true },
            { label: 'Cancelar', status: 'cancelado' },
          ]
        : [{ label: 'Cancelar', status: 'cancelado' }];

  return (
    <Card
      style={[styles.card, highlight ? { borderColor: colors.primary, borderWidth: 2 } : null]}>
      <View style={styles.cardHeader}>
        <View style={styles.grow}>
          <AppText variant="bodyBold">{item.client_name}</AppText>
          <AppText variant="support" color="textSecondary">
            {formatPhone(item.client_phone)}
          </AppText>
        </View>

        {item.status === 'pendente' ? (
          <View style={[styles.badge, { backgroundColor: colors.blush }]}>
            <AppText variant="label" color="onPrimary">
              Aguardando você
            </AppText>
          </View>
        ) : null}
      </View>

      <View style={[styles.divider, { borderTopColor: colors.border }]}>
        <AppText variant="bodyBold">
          {starts.toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: '2-digit' })}
          {'  '}
          {hora(starts)} – {hora(ends)}
        </AppText>
        <AppText variant="support" color="textSecondary" style={styles.line}>
          {item.services.join(' + ') || 'Sem serviço registrado'}
        </AppText>
        <AppText variant="bodyBold" color="textAccent" style={styles.line}>
          {formatPrice(item.price_cents)}
          {item.discount_cents > 0 ? ` · ${formatPrice(item.discount_cents)} de desconto` : ''}
        </AppText>
      </View>

      <View style={styles.actions}>
        {actions.map((action) => (
          <Pressable
            key={action.status}
            accessibilityRole="button"
            accessibilityLabel={`${action.label} atendimento de ${item.client_name}`}
            disabled={busy}
            onPress={() => onAct(item, action.status)}
            style={({ pressed }) => [
              styles.action,
              {
                backgroundColor: action.primary ? colors.primary : 'transparent',
                borderColor: action.primary ? colors.primary : colors.border,
                opacity: busy ? 0.4 : pressed ? 0.7 : 1,
              },
            ]}>
            <AppText variant="label" color={action.primary ? 'onPrimary' : 'textSecondary'}>
              {action.label}
            </AppText>
          </Pressable>
        ))}
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: Spacing.three },
  inner: { width: '100%', maxWidth: MaxContentWidth, alignSelf: 'center' },
  errorCard: { marginTop: Spacing.three },
  loader: { marginTop: Spacing.five },
  section: { marginTop: Spacing.five, marginBottom: Spacing.two, letterSpacing: 1 },
  card: { marginBottom: Spacing.three },
  cardHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.two },
  grow: { flex: 1 },
  badge: { paddingHorizontal: Spacing.two, paddingVertical: Spacing.one, borderRadius: Radius.pill },
  divider: { borderTopWidth: 1, marginTop: Spacing.three, paddingTop: Spacing.three },
  line: { marginTop: Spacing.one },
  actions: { flexDirection: 'row', gap: Spacing.two, marginTop: Spacing.three },
  action: {
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    borderRadius: Radius.pill,
    borderWidth: 1,
  },
});
