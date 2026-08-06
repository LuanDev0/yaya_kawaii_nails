/**
 * Faturamento.
 *
 * Um período por vez — dia, semana ou mês —, e tudo na tela recalcula junto.
 * O número sozinho diz pouco: ao lado dele vem sempre o período anterior de
 * mesmo tamanho, que é o que transforma "R$ 800" em "R$ 800, subiu".
 */

import { useFocusEffect } from 'expo-router';
import { useCallback, useState, type ReactNode } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppText } from '@/components/app-text';
import { Card } from '@/components/card';
import { PaymentPicker } from '@/components/payment-picker';
import { ScreenHeader } from '@/components/screen-header';
import { MaxContentWidth, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import {
  MONTH_NAMES,
  formatISODate,
  periodRange,
  previousPeriodRange,
  todayISO,
  type Period,
} from '@/lib/calendar';
import { loadFinance, setPaymentMethod, type Finance, type NamedTotal } from '@/lib/finance';
import { formatPrice } from '@/lib/format';
import { paymentLabel, type PaymentMethod } from '@/lib/payment';

const PERIODS: { value: Period; label: string }[] = [
  { value: 'dia', label: 'Hoje' },
  { value: 'semana', label: 'Semana' },
  { value: 'mes', label: 'Mês' },
];

const PREVIOUS_LABEL: Record<Period, string> = {
  dia: 'ontem',
  semana: 'semana passada',
  mes: 'mês passado',
};

export default function FinanceScreen() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();

  const [period, setPeriod] = useState<Period>('mes');
  const [current, setCurrent] = useState<Finance | null>(null);
  const [previous, setPrevious] = useState<Finance | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const range = periodRange(period, todayISO());

  const reload = useCallback(async () => {
    // Hoje é lido aqui dentro, e não no corpo do componente: com o app aberto
    // a noite inteira, a virada do dia entra na próxima consulta sozinha.
    const today = todayISO();
    const now = periodRange(period, today);
    const before = previousPeriodRange(period, today);

    try {
      const [atual, passado] = await Promise.all([
        loadFinance(now.from, now.to),
        loadFinance(before.from, before.to),
      ]);

      setCurrent(atual);
      setPrevious(passado);
    } catch (cause) {
      setError((cause as Error).message);
    }
  }, [period]);

  useFocusEffect(
    useCallback(() => {
      setCurrent(null);
      reload();
    }, [reload]),
  );

  async function anotate(id: string, method: PaymentMethod) {
    setBusy(id);
    setError(null);

    try {
      await setPaymentMethod(id, method);
      await reload();
    } catch (cause) {
      setError((cause as Error).message);
    } finally {
      setBusy(null);
    }
  }

  const subtitle =
    period === 'dia'
      ? formatISODate(range.from)
      : period === 'semana'
        ? `${formatISODate(range.from)} a ${formatISODate(range.to)}`
        : `${MONTH_NAMES[Number(range.from.split('-')[1]) - 1]} de ${range.from.split('-')[0]}`;

  return (
    <ScrollView
      style={{ backgroundColor: colors.background }}
      contentContainerStyle={[
        styles.content,
        { paddingTop: insets.top + Spacing.three, paddingBottom: insets.bottom + Spacing.five },
      ]}>
      <View style={styles.inner}>
        <ScreenHeader title="Faturamento" subtitle={subtitle} />

        <View style={styles.periods}>
          {PERIODS.map((option) => {
            const chosen = option.value === period;

            return (
              <Pressable
                key={option.value}
                accessibilityRole="button"
                accessibilityState={{ selected: chosen }}
                aria-selected={chosen}
                onPress={() => setPeriod(option.value)}
                style={({ pressed }) => [
                  styles.period,
                  {
                    backgroundColor: chosen ? colors.primary : 'transparent',
                    borderColor: chosen ? colors.primary : colors.border,
                    opacity: pressed ? 0.7 : 1,
                  },
                ]}>
                <AppText variant="label" color={chosen ? 'onPrimary' : 'textSecondary'}>
                  {option.label}
                </AppText>
              </Pressable>
            );
          })}
        </View>

        {error ? (
          <Card style={styles.spaced}>
            <AppText variant="support" color="textAccent">
              {error}
            </AppText>
          </Card>
        ) : null}

        {current === null ? (
          <ActivityIndicator color={colors.primary} style={styles.loader} />
        ) : (
          <>
            <Card style={styles.spaced}>
              <AppText variant="title">{formatPrice(current.total_cents)}</AppText>

              <AppText variant="support" color="textSecondary" style={styles.line}>
                {current.count === 0
                  ? 'Nenhum atendimento concluído neste período'
                  : `${current.count} atendimento${current.count > 1 ? 's' : ''} concluído${
                      current.count > 1 ? 's' : ''
                    }`}
              </AppText>

              {previous ? (
                <AppText variant="support" color="textSecondary">
                  {PREVIOUS_LABEL[period]}: {formatPrice(previous.total_cents)}
                  {difference(current.total_cents, previous.total_cents)}
                </AppText>
              ) : null}

              {current.discount_cents > 0 ? (
                <AppText variant="support" color="textAccent" style={styles.line}>
                  {formatPrice(current.discount_cents)} concedidos em promoção
                </AppText>
              ) : null}
            </Card>

            {/* Só concluído entra na conta — atendimento marcado e não fechado
                pode ter sido furo, e faturamento que conta dinheiro que não
                entrou é pior que faturamento nenhum. */}
            {current.count === 0 ? (
              <Card>
                <AppText variant="body" color="textSecondary">
                  Assim que você concluir um atendimento na agenda, ele aparece aqui.
                </AppText>
              </Card>
            ) : (
              <>
                <Section title="COMO ENTROU">
                  {current.by_payment.map((entry) => (
                    <Line
                      key={entry.method ?? 'sem'}
                      name={paymentLabel(entry.method)}
                      count={entry.count}
                      cents={entry.total_cents}
                      faded={entry.method === null}
                    />
                  ))}
                </Section>

                <Section title="QUAIS SERVIÇOS RENDERAM MAIS">
                  {current.by_service.map((entry) => (
                    <Line key={entry.key} {...toLine(entry)} />
                  ))}
                </Section>

                <Section title="QUEM MAIS GASTOU">
                  {current.by_client.map((entry) => (
                    <Line key={entry.key} {...toLine(entry)} />
                  ))}
                </Section>

                {current.missing_payment.length > 0 ? (
                  <>
                    <AppText variant="label" color="textAccent" style={styles.section}>
                      FALTA ANOTAR COMO PAGOU
                    </AppText>

                    {current.missing_payment.map((entry) => (
                      <Card key={entry.id} style={styles.spaced}>
                        <AppText variant="bodyBold">{entry.client_name}</AppText>
                        <AppText variant="support" color="textSecondary" style={styles.line}>
                          {new Date(entry.starts_at).toLocaleDateString('pt-BR')} ·{' '}
                          {formatPrice(entry.price_cents)}
                        </AppText>

                        <View style={styles.line}>
                          <PaymentPicker
                            disabled={busy === entry.id}
                            onPick={(method) => anotate(entry.id, method)}
                          />
                        </View>
                      </Card>
                    ))}
                  </>
                ) : null}
              </>
            )}
          </>
        )}
      </View>
    </ScrollView>
  );
}

function toLine(entry: NamedTotal) {
  return { name: entry.name, count: entry.count, cents: entry.total_cents };
}

/** "subiu R$ 40" diz mais que dois números que a dona tem de subtrair de cabeça. */
function difference(now: number, past: number): string {
  if (past === 0 || now === past) return '';

  const delta = now - past;
  return delta > 0 ? ` · subiu ${formatPrice(delta)}` : ` · caiu ${formatPrice(-delta)}`;
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <>
      <AppText variant="label" color="textSecondary" style={styles.section}>
        {title}
      </AppText>
      <Card style={styles.spaced}>{children}</Card>
    </>
  );
}

function Line({
  name,
  count,
  cents,
  faded,
}: {
  name: string;
  count: number;
  cents: number;
  faded?: boolean;
}) {
  return (
    <View style={styles.lineRow}>
      <View style={styles.grow}>
        <AppText variant="bodyBold" color={faded ? 'textSecondary' : 'textPrimary'}>
          {name}
        </AppText>
        <AppText variant="support" color="textSecondary">
          {count}
          {count > 1 ? ' vezes' : ' vez'}
        </AppText>
      </View>

      <AppText variant="bodyBold" color={faded ? 'textSecondary' : 'textAccent'}>
        {formatPrice(cents)}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: Spacing.three },
  inner: { width: '100%', maxWidth: MaxContentWidth, alignSelf: 'center' },
  periods: { flexDirection: 'row', gap: Spacing.two, marginBottom: Spacing.four },
  period: {
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.two,
    borderRadius: Radius.pill,
    borderWidth: 1,
  },
  loader: { marginTop: Spacing.five },
  spaced: { marginBottom: Spacing.three },
  line: { marginTop: Spacing.one },
  section: { marginTop: Spacing.four, marginBottom: Spacing.two, letterSpacing: 1 },
  lineRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two, paddingVertical: Spacing.two },
  grow: { flex: 1 },
});
