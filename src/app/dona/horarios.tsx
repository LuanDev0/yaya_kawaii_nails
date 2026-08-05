/** Dias e faixas de atendimento. Dia desligado é dia sem atendimento. */

import { useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppText } from '@/components/app-text';
import { Button } from '@/components/button';
import { Card } from '@/components/card';
import { ScreenHeader } from '@/components/screen-header';
import { TextField } from '@/components/text-field';
import { Toggle } from '@/components/toggle';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { useAuth } from '@/hooks/use-auth';
import { useTheme } from '@/hooks/use-theme';
import { clearBusinessHour, listBusinessHours, setBusinessHour } from '@/lib/business-hours';
import { WEEKDAYS, formatTime, parseTime } from '@/lib/format';

type DayState = {
  open: boolean;
  opensAt: string;
  closesAt: string;
};

const DEFAULT_DAY: DayState = { open: false, opensAt: '09:00', closesAt: '18:00' };

export default function BusinessHoursScreen() {
  const { colors } = useTheme();
  const { professional } = useAuth();
  const insets = useSafeAreaInsets();

  const [days, setDays] = useState<DayState[] | null>(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<number, string>>({});

  useEffect(() => {
    if (!professional) return;

    let active = true;

    listBusinessHours(professional.id)
      .then((hours) => {
        if (!active) return;

        setDays(
          WEEKDAYS.map((_, weekday) => {
            const found = hours.find((hour) => hour.weekday === weekday);

            return found
              ? { open: true, opensAt: formatTime(found.opens_at), closesAt: formatTime(found.closes_at) }
              : { ...DEFAULT_DAY };
          }),
        );
      })
      .catch((cause: Error) => active && setMessage(cause.message));

    return () => {
      active = false;
    };
  }, [professional]);

  function updateDay(weekday: number, patch: Partial<DayState>) {
    setDays((current) =>
      current?.map((day, index) => (index === weekday ? { ...day, ...patch } : day)) ?? null,
    );
  }

  async function handleSave() {
    if (!days || !professional) return;

    const found: Record<number, string> = {};

    days.forEach((day, weekday) => {
      if (!day.open) return;

      const opens = parseTime(day.opensAt);
      const closes = parseTime(day.closesAt);

      if (!opens || !closes) {
        found[weekday] = 'Escreva no formato 09:00.';
      } else if (closes <= opens) {
        found[weekday] = 'O fechamento precisa ser depois da abertura.';
      }
    });

    setErrors(found);
    if (Object.keys(found).length > 0) return;

    setSaving(true);
    setMessage(null);

    try {
      for (const [weekday, day] of days.entries()) {
        if (day.open) {
          await setBusinessHour(
            professional.id,
            weekday,
            parseTime(day.opensAt)!,
            parseTime(day.closesAt)!,
          );
        } else {
          await clearBusinessHour(professional.id, weekday);
        }
      }

      setMessage('Horários salvos.');
    } catch (cause) {
      setMessage((cause as Error).message);
    } finally {
      setSaving(false);
    }
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
          title="Horários"
          subtitle="A duração do serviço é respeitada: um de 2h30 não aparece se faltar menos que isso para fechar."
        />

        {message ? (
          <Card style={styles.messageCard}>
            <AppText variant="support" color="textAccent">
              {message}
            </AppText>
          </Card>
        ) : null}

        {days === null ? (
          <ActivityIndicator color={colors.primary} />
        ) : (
          <Card>
            {days.map((day, weekday) => (
              <View
                key={weekday}
                style={[
                  styles.day,
                  weekday > 0 && { borderTopWidth: 1, borderTopColor: colors.border },
                ]}>
                <View style={styles.dayHeader}>
                  <AppText variant="bodyBold" color={day.open ? 'textPrimary' : 'textSecondary'}>
                    {WEEKDAYS[weekday]}
                  </AppText>
                  <Toggle
                    value={day.open}
                    onValueChange={(open) => updateDay(weekday, { open })}
                    accessibilityLabel={`Atender ${WEEKDAYS[weekday]}`}
                  />
                </View>

                {day.open ? (
                  <View style={styles.times}>
                    <View style={styles.timeField}>
                      <TextField
                        label="Abre"
                        value={day.opensAt}
                        onChangeText={(opensAt) => updateDay(weekday, { opensAt })}
                        placeholder="09:00"
                        editable={!saving}
                      />
                    </View>
                    <View style={styles.timeField}>
                      <TextField
                        label="Fecha"
                        value={day.closesAt}
                        onChangeText={(closesAt) => updateDay(weekday, { closesAt })}
                        placeholder="18:00"
                        editable={!saving}
                        error={errors[weekday]}
                      />
                    </View>
                  </View>
                ) : null}
              </View>
            ))}
          </Card>
        )}

        <View style={styles.footer}>
          <Button
            label={saving ? 'Salvando...' : 'Salvar horários'}
            onPress={handleSave}
            disabled={saving || days === null}
          />
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: Spacing.three },
  inner: { width: '100%', maxWidth: MaxContentWidth, alignSelf: 'center' },
  messageCard: { marginBottom: Spacing.three },
  day: { paddingVertical: Spacing.three },
  dayHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  times: { flexDirection: 'row', gap: Spacing.three, marginTop: Spacing.three },
  timeField: { flex: 1 },
  footer: { marginTop: Spacing.four },
});
