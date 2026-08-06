/**
 * A agenda da dona. Tela do dia a dia, por isso é a inicial da área dela.
 *
 * Duas listas: o que espera uma decisão dela, e o que vem pela frente.
 */

import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Linking, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppText } from '@/components/app-text';
import { Card } from '@/components/card';
import { OwnerModeSwitch } from '@/components/owner-mode-switch';
import { PaymentPicker } from '@/components/payment-picker';
import { MaxContentWidth, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import {
  concludeAppointment,
  listPending,
  listUpcoming,
  setStatus,
  type AgendaItem,
} from '@/lib/agenda';
import { type AppointmentStatus } from '@/lib/booking';
import { formatPhone } from '@/lib/clients';
import { formatPrice } from '@/lib/format';
import { type PaymentMethod } from '@/lib/payment';
import { buildMessage, whatsAppUrl } from '@/lib/whatsapp';

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

  async function conclude(item: AgendaItem, payment: PaymentMethod | null) {
    setBusy(item.id);
    setError(null);

    try {
      await concludeAppointment(item.id, payment);
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
                    onConclude={conclude}
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
                <AppointmentCard
                  key={item.id}
                  item={item}
                  busy={busy === item.id}
                  onAct={act}
                  onConclude={conclude}
                />
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
  onConclude,
  highlight,
}: {
  item: AgendaItem;
  busy: boolean;
  onAct: (item: AgendaItem, status: AppointmentStatus) => void;
  onConclude: (item: AgendaItem, payment: PaymentMethod | null) => void;
  highlight?: boolean;
}) {
  const { colors } = useTheme();
  const router = useRouter();

  // Concluir abre a pergunta do pagamento em vez de fechar direto.
  const [asking, setAsking] = useState(false);

  const starts = new Date(item.starts_at);
  const ends = new Date(item.ends_at);
  const hora = (d: Date) => d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  const passou = starts < new Date();

  // Véspera: o texto muda de "está confirmado" para "passando pra lembrar".
  const isTomorrow =
    starts.toDateString() === new Date(Date.now() + 24 * 60 * 60 * 1000).toDateString();

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
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Ficha de ${item.client_name}`}
          onPress={() => router.push(`/dona/cliente/${item.client_id}`)}
          style={({ pressed }) => [styles.grow, pressed && { opacity: 0.6 }]}>
          <AppText variant="bodyBold">
            {item.client_name} <AppText variant="bodyBold" color="textAccent">›</AppText>
          </AppText>
          <AppText variant="support" color="textSecondary">
            {formatPhone(item.client_phone)}
          </AppText>
        </Pressable>

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

      {asking ? (
        <View style={styles.asking}>
          <AppText variant="label" color="textSecondary">
            PAGOU COMO?
          </AppText>

          <PaymentPicker
            disabled={busy}
            onPick={(method) => {
              setAsking(false);
              onConclude(item, method);
            }}
            onSkip={() => {
              setAsking(false);
              onConclude(item, null);
            }}
          />

          {/* Saída para quem tocou em Concluir sem querer. */}
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Voltar sem concluir"
            disabled={busy}
            onPress={() => setAsking(false)}
            style={({ pressed }) => [styles.backOut, pressed && { opacity: 0.6 }]}>
            <AppText variant="support" color="textSecondary">
              Voltar sem concluir
            </AppText>
          </Pressable>
        </View>
      ) : (
      <View style={styles.actions}>
        {/* Só depois de confirmado: mandar mensagem sobre pedido que ainda
            pode ser recusado seria prometer o que não foi decidido. */}
        {item.status === 'confirmado' ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Mandar WhatsApp para ${item.client_name}`}
            onPress={() =>
              Linking.openURL(
                whatsAppUrl(
                  item.client_phone,
                  buildMessage(isTomorrow ? 'lembrete' : 'confirmacao', {
                    client_name: item.client_name,
                    starts_at: item.starts_at,
                    services: item.services,
                    price: formatPrice(item.price_cents),
                  }),
                ),
              )
            }
            style={({ pressed }) => [
              styles.action,
              { borderColor: colors.border, opacity: pressed ? 0.7 : 1 },
            ]}>
            <AppText variant="label" color="textAccent">
              WhatsApp
            </AppText>
          </Pressable>
        ) : null}

        {/* Só depois da hora: fotografar unha que ainda não foi feita não
            existe. Some junto com o card quando ela conclui — a partir daí o
            caminho é a ficha da cliente. */}
        {passou && item.status === 'confirmado' ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Fotos do atendimento de ${item.client_name}`}
            onPress={() => router.push({ pathname: '/dona/fotos/[id]', params: { id: item.id } })}
            style={({ pressed }) => [
              styles.action,
              { borderColor: colors.border, opacity: pressed ? 0.7 : 1 },
            ]}>
            <AppText variant="label" color="textAccent">
              Fotos
            </AppText>
          </Pressable>
        ) : null}

        {actions.map((action) => (
          <Pressable
            key={action.status}
            accessibilityRole="button"
            accessibilityLabel={`${action.label} atendimento de ${item.client_name}`}
            disabled={busy}
            onPress={() =>
              action.status === 'concluido' ? setAsking(true) : onAct(item, action.status)
            }
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
      )}
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
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two, marginTop: Spacing.three },
  asking: { gap: Spacing.two, marginTop: Spacing.three },
  backOut: { alignSelf: 'flex-start', paddingVertical: Spacing.one },
  action: {
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    borderRadius: Radius.pill,
    borderWidth: 1,
  },
});
