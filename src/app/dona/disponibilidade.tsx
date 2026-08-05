/**
 * Disponibilidade: o padrão semanal com exceções por data (DT-016).
 *
 * Uma exceção substitui o padrão naquele dia — fechando, mudando a faixa ou
 * abrindo um dia que normalmente não atende.
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppText } from '@/components/app-text';
import { Button } from '@/components/button';
import { Card } from '@/components/card';
import { ScreenHeader } from '@/components/screen-header';
import { TextField } from '@/components/text-field';
import { MaxContentWidth, Radius, Spacing } from '@/constants/theme';
import { useAuth } from '@/hooks/use-auth';
import { useTheme } from '@/hooks/use-theme';
import { listBusinessHours, type BusinessHour } from '@/lib/business-hours';
import {
  MONTH_NAMES,
  formatISODate,
  monthWeeks,
  parseBRDate,
  todayISO,
  toISODate,
  weekdayOf,
  type ISODate,
} from '@/lib/calendar';
import { formatTime, parseTime } from '@/lib/format';
import {
  clearException,
  closePeriod,
  listExceptions,
  setException,
  type ScheduleException,
} from '@/lib/schedule-exceptions';

type DayStatus = 'padrao-aberto' | 'padrao-fechado' | 'excecao-aberta' | 'excecao-fechada';
type EditorMode = 'padrao' | 'fechado' | 'faixa';

const WEEKDAY_INITIALS = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'];

export default function AvailabilityScreen() {
  const { colors } = useTheme();
  const { professional } = useAuth();
  const insets = useSafeAreaInsets();

  const today = todayISO();
  const [year, setYear] = useState(() => Number(today.slice(0, 4)));
  const [month, setMonth] = useState(() => Number(today.slice(5, 7)) - 1);

  const [hours, setHours] = useState<BusinessHour[] | null>(null);
  const [exceptions, setExceptions] = useState<ScheduleException[]>([]);
  const [selected, setSelected] = useState<ISODate | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const weeks = useMemo(() => monthWeeks(year, month), [year, month]);

  const reload = useCallback(async () => {
    if (!professional) return;

    const from = toISODate(year, month, 1);
    const to = toISODate(year, month, new Date(year, month + 1, 0).getDate());

    const [loadedHours, loadedExceptions] = await Promise.all([
      listBusinessHours(professional.id),
      listExceptions(professional.id, from, to, true),
    ]);

    setHours(loadedHours);
    setExceptions(loadedExceptions);
  }, [professional, year, month]);

  useEffect(() => {
    reload().catch((cause: Error) => setMessage(cause.message));
  }, [reload]);

  function statusOf(date: ISODate): DayStatus {
    const exception = exceptions.find((item) => item.date === date);

    if (exception) return exception.opens_at ? 'excecao-aberta' : 'excecao-fechada';

    return hours?.some((hour) => hour.weekday === weekdayOf(date))
      ? 'padrao-aberto'
      : 'padrao-fechado';
  }

  function colorsFor(status: DayStatus, isSelected: boolean) {
    if (isSelected) return { bg: colors.primary, fg: colors.onPrimary };

    switch (status) {
      case 'excecao-aberta':
        return { bg: colors.secondary, fg: colors.onPrimary };
      case 'excecao-fechada':
        return { bg: colors.blush, fg: colors.onPrimary };
      case 'padrao-aberto':
        return { bg: colors.surface, fg: colors.textPrimary };
      default:
        return { bg: 'transparent', fg: colors.textSecondary };
    }
  }

  function shiftMonth(delta: number) {
    const next = new Date(year, month + delta, 1);
    setYear(next.getFullYear());
    setMonth(next.getMonth());
    setSelected(null);
  }

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
          title="Disponibilidade"
          subtitle="O padrão semanal vale sempre. Aqui você ajusta as datas que fogem dele."
        />

        {message ? (
          <Card style={styles.messageCard}>
            <AppText variant="support" color="textAccent">
              {message}
            </AppText>
          </Card>
        ) : null}

        <View style={styles.monthBar}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Mês anterior"
            onPress={() => shiftMonth(-1)}
            style={({ pressed }) => [styles.monthArrow, pressed && { opacity: 0.6 }]}>
            <AppText variant="heading" color="textAccent">
              ‹
            </AppText>
          </Pressable>

          <AppText variant="subheading">
            {MONTH_NAMES[month]} de {year}
          </AppText>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Próximo mês"
            onPress={() => shiftMonth(1)}
            style={({ pressed }) => [styles.monthArrow, pressed && { opacity: 0.6 }]}>
            <AppText variant="heading" color="textAccent">
              ›
            </AppText>
          </Pressable>
        </View>

        {hours === null ? (
          <ActivityIndicator color={colors.primary} />
        ) : (
          <>
            <View style={styles.weekRow}>
              {WEEKDAY_INITIALS.map((initial, index) => (
                <View key={index} style={styles.cell}>
                  <AppText variant="label" color="textSecondary">
                    {initial}
                  </AppText>
                </View>
              ))}
            </View>

            {weeks.map((week, weekIndex) => (
              <View key={weekIndex} style={styles.weekRow}>
                {week.map((date, dayIndex) => {
                  if (!date) return <View key={dayIndex} style={styles.cell} />;

                  const isSelected = selected === date;
                  const isPast = date < today;
                  const { bg, fg } = colorsFor(statusOf(date), isSelected);

                  return (
                    <Pressable
                      key={dayIndex}
                      accessibilityRole="button"
                      accessibilityLabel={formatISODate(date)}
                      onPress={() => setSelected(isSelected ? null : date)}
                      style={styles.cell}>
                      <View
                        style={[
                          styles.day,
                          { backgroundColor: bg, borderColor: colors.border },
                          isPast && styles.past,
                        ]}>
                        <AppText variant="support" style={{ color: fg }}>
                          {Number(date.slice(8))}
                        </AppText>
                      </View>
                    </Pressable>
                  );
                })}
              </View>
            ))}

            <View style={styles.legend}>
              <Legend color={colors.surface} label="Padrão" bordered />
              <Legend color={colors.secondary} label="Horário diferente" />
              <Legend color={colors.blush} label="Não atende" />
            </View>

            {selected ? (
              <DayEditor
                date={selected}
                exception={exceptions.find((item) => item.date === selected) ?? null}
                followsPattern={hours.some((hour) => hour.weekday === weekdayOf(selected))}
                professionalId={professional!.id}
                onDone={async (text) => {
                  setMessage(text);
                  await reload();
                }}
              />
            ) : (
              <Card style={styles.hintCard}>
                <AppText variant="support" color="textSecondary">
                  Toque num dia para ajustar.
                </AppText>
              </Card>
            )}

            <PeriodCloser
              professionalId={professional!.id}
              onDone={async (text) => {
                setMessage(text);
                await reload();
              }}
            />
          </>
        )}
      </View>
    </ScrollView>
  );
}

function Legend({ color, label, bordered }: { color: string; label: string; bordered?: boolean }) {
  const { colors } = useTheme();

  return (
    <View style={styles.legendItem}>
      <View
        style={[
          styles.legendDot,
          { backgroundColor: color, borderColor: bordered ? colors.border : color },
        ]}
      />
      <AppText variant="label" color="textSecondary">
        {label}
      </AppText>
    </View>
  );
}

function DayEditor({
  date,
  exception,
  followsPattern,
  professionalId,
  onDone,
}: {
  date: ISODate;
  exception: ScheduleException | null;
  followsPattern: boolean;
  professionalId: string;
  onDone: (message: string) => Promise<void>;
}) {
  const { colors } = useTheme();

  const initialMode: EditorMode = !exception ? 'padrao' : exception.opens_at ? 'faixa' : 'fechado';

  const [mode, setMode] = useState<EditorMode>(initialMode);
  const [opensAt, setOpensAt] = useState(exception?.opens_at ? formatTime(exception.opens_at) : '09:00');
  const [closesAt, setClosesAt] = useState(
    exception?.closes_at ? formatTime(exception.closes_at) : '18:00',
  );
  const [note, setNote] = useState(exception?.note ?? '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setMode(initialMode);
    setOpensAt(exception?.opens_at ? formatTime(exception.opens_at) : '09:00');
    setClosesAt(exception?.closes_at ? formatTime(exception.closes_at) : '18:00');
    setNote(exception?.note ?? '');
    setError(null);
  }, [date, exception, initialMode]);

  async function handleSave() {
    setError(null);

    if (mode === 'faixa') {
      const opens = parseTime(opensAt);
      const closes = parseTime(closesAt);

      if (!opens || !closes) return setError('Escreva os horários no formato 09:00.');
      if (closes <= opens) return setError('O fechamento precisa ser depois da abertura.');
    }

    setSaving(true);

    try {
      if (mode === 'padrao') {
        await clearException(professionalId, date);
        await onDone(`${formatISODate(date)} voltou a seguir o padrão.`);
      } else if (mode === 'fechado') {
        await setException(professionalId, date, null, null, note.trim() || null);
        await onDone(`${formatISODate(date)} marcado como sem atendimento.`);
      } else {
        await setException(
          professionalId,
          date,
          parseTime(opensAt)!,
          parseTime(closesAt)!,
          note.trim() || null,
        );
        await onDone(`${formatISODate(date)} com horário próprio.`);
      }
    } catch (cause) {
      setError((cause as Error).message);
    } finally {
      setSaving(false);
    }
  }

  const options: { value: EditorMode; label: string }[] = [
    { value: 'padrao', label: followsPattern ? 'Padrão (atende)' : 'Padrão (fechado)' },
    { value: 'fechado', label: 'Não atender' },
    { value: 'faixa', label: 'Horário diferente' },
  ];

  return (
    <Card style={styles.editor}>
      <AppText variant="subheading">{formatISODate(date)}</AppText>

      <View style={styles.options}>
        {options.map((option) => {
          const active = mode === option.value;

          return (
            <Pressable
              key={option.value}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
              onPress={() => setMode(option.value)}
              style={[
                styles.option,
                {
                  backgroundColor: active ? colors.primary : 'transparent',
                  borderColor: active ? colors.primary : colors.border,
                },
              ]}>
              <AppText variant="label" color={active ? 'onPrimary' : 'textSecondary'}>
                {option.label}
              </AppText>
            </Pressable>
          );
        })}
      </View>

      {mode === 'faixa' ? (
        <View style={styles.times}>
          <View style={styles.timeField}>
            <TextField label="Abre" value={opensAt} onChangeText={setOpensAt} editable={!saving} />
          </View>
          <View style={styles.timeField}>
            <TextField
              label="Fecha"
              value={closesAt}
              onChangeText={setClosesAt}
              editable={!saving}
            />
          </View>
        </View>
      ) : null}

      {mode !== 'padrao' ? (
        <TextField
          label="Motivo (só você vê)"
          value={note}
          onChangeText={setNote}
          placeholder="Viagem, consulta, curso..."
          editable={!saving}
        />
      ) : null}

      {error ? (
        <AppText variant="support" color="textAccent" style={styles.editorError}>
          {error}
        </AppText>
      ) : null}

      <Button label={saving ? 'Salvando...' : 'Aplicar'} onPress={handleSave} disabled={saving} />
    </Card>
  );
}

function PeriodCloser({
  professionalId,
  onDone,
}: {
  professionalId: string;
  onDone: (message: string) => Promise<void>;
}) {
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleClose() {
    setError(null);

    const fromISO = parseBRDate(from);
    const toISO = parseBRDate(to);

    if (!fromISO || !toISO) return setError('Use o formato 10/08/2026.');
    if (toISO < fromISO) return setError('A data final precisa ser depois da inicial.');

    setSaving(true);

    try {
      const total = await closePeriod(professionalId, fromISO, toISO, note.trim() || null);
      await onDone(`${total} dia${total > 1 ? 's' : ''} marcado${total > 1 ? 's' : ''} sem atendimento.`);
      setFrom('');
      setTo('');
      setNote('');
    } catch (cause) {
      setError((cause as Error).message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card style={styles.period}>
      <AppText variant="subheading">Fechar um período</AppText>
      <AppText variant="support" color="textSecondary" style={styles.periodHint}>
        Férias ou viagem, sem precisar marcar dia por dia no calendário.
      </AppText>

      <View style={styles.times}>
        <View style={styles.timeField}>
          <TextField
            label="De"
            value={from}
            onChangeText={setFrom}
            placeholder="10/08/2026"
            editable={!saving}
          />
        </View>
        <View style={styles.timeField}>
          <TextField
            label="Até"
            value={to}
            onChangeText={setTo}
            placeholder="17/08/2026"
            editable={!saving}
          />
        </View>
      </View>

      <TextField
        label="Motivo (só você vê)"
        value={note}
        onChangeText={setNote}
        placeholder="Férias"
        editable={!saving}
      />

      {error ? (
        <AppText variant="support" color="textAccent" style={styles.editorError}>
          {error}
        </AppText>
      ) : null}

      <Button
        label={saving ? 'Fechando...' : 'Fechar período'}
        variant="secondary"
        onPress={handleClose}
        disabled={saving}
      />
    </Card>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: Spacing.three },
  inner: { width: '100%', maxWidth: MaxContentWidth, alignSelf: 'center' },
  messageCard: { marginBottom: Spacing.three },
  monthBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.three,
  },
  monthArrow: { paddingHorizontal: Spacing.three, paddingVertical: Spacing.one },
  weekRow: { flexDirection: 'row' },
  cell: { flex: 1, alignItems: 'center', paddingVertical: Spacing.half },
  day: {
    width: 38,
    height: 38,
    borderRadius: Radius.small,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  past: { opacity: 0.35 },
  legend: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.three,
    marginTop: Spacing.three,
  },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: Spacing.one },
  legendDot: { width: 14, height: 14, borderRadius: 4, borderWidth: 1 },
  hintCard: { marginTop: Spacing.four },
  editor: { marginTop: Spacing.four },
  options: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two, marginVertical: Spacing.three },
  option: { paddingHorizontal: Spacing.three, paddingVertical: Spacing.two, borderRadius: Radius.pill, borderWidth: 1 },
  times: { flexDirection: 'row', gap: Spacing.three },
  timeField: { flex: 1 },
  editorError: { marginBottom: Spacing.two },
  period: { marginTop: Spacing.four },
  periodHint: { marginTop: Spacing.one, marginBottom: Spacing.three },
});
