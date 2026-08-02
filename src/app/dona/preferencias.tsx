/**
 * Preferências do salão.
 *
 * São chaves e não regra fixa no código (DT-008): a dona começa aprovando
 * tudo e desliga quando cansar, sem depender de alteração no app.
 */

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
import { useTheme } from '@/hooks/use-theme';
import { getSettings, updateSettings, type Settings } from '@/lib/settings';

export default function PreferencesScreen() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();

  const [settings, setSettings] = useState<Settings | null>(null);
  const [reminderDays, setReminderDays] = useState('');
  const [windowDays, setWindowDays] = useState('');
  const [noticeHours, setNoticeHours] = useState('');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    let active = true;

    getSettings()
      .then((data) => {
        if (!active || !data) return;

        setSettings(data);
        setReminderDays(String(data.maintenance_reminder_days));
        setWindowDays(String(data.booking_window_days));
        setNoticeHours(String(data.minimum_notice_hours));
      })
      .catch((cause: Error) => active && setMessage(cause.message));

    return () => {
      active = false;
    };
  }, []);

  async function handleSave() {
    if (!settings) return;

    const days = Number(reminderDays);
    const window = Number(windowDays);
    const notice = Number(noticeHours);

    const found: Record<string, string> = {};
    if (!Number.isInteger(days) || days <= 0) found.days = 'Um número de dias maior que zero.';
    if (!Number.isInteger(window) || window <= 0) found.window = 'Um número de dias maior que zero.';
    if (!Number.isInteger(notice) || notice < 0) found.notice = 'Um número de horas, zero ou mais.';

    setErrors(found);
    if (Object.keys(found).length > 0) return;

    setSaving(true);
    setMessage(null);

    try {
      await updateSettings({
        ...settings,
        maintenance_reminder_days: days,
        booking_window_days: window,
        minimum_notice_hours: notice,
      });
      setMessage('Preferências salvas.');
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
        <ScreenHeader title="Preferências" />

        {message ? (
          <Card style={styles.messageCard}>
            <AppText variant="support" color="textAccent">
              {message}
            </AppText>
          </Card>
        ) : null}

        {settings === null ? (
          <ActivityIndicator color={colors.primary} />
        ) : (
          <>
            <Card>
              <View style={styles.option}>
                <View style={styles.optionText}>
                  <AppText variant="bodyBold">Aprovar cada agendamento</AppText>
                  <AppText variant="support" color="textSecondary">
                    Ligado, o horário fica pendente até você confirmar. Desligado, já nasce
                    confirmado.
                  </AppText>
                </View>
                <Toggle
                  value={settings.require_approval}
                  onValueChange={(require_approval) =>
                    setSettings({ ...settings, require_approval })
                  }
                  accessibilityLabel="Aprovar cada agendamento"
                />
              </View>

              <View style={[styles.option, { borderTopWidth: 1, borderTopColor: colors.border }]}>
                <View style={styles.optionText}>
                  <AppText variant="bodyBold">Cliente pode cancelar sozinha</AppText>
                  <AppText variant="support" color="textSecondary">
                    Desligado, ela precisa falar com você para desmarcar.
                  </AppText>
                </View>
                <Toggle
                  value={settings.allow_client_cancel}
                  onValueChange={(allow_client_cancel) =>
                    setSettings({ ...settings, allow_client_cancel })
                  }
                  accessibilityLabel="Cliente pode cancelar sozinha"
                />
              </View>
            </Card>

            <View style={styles.field}>
              <TextField
                label="Prazo de retorno, em dias"
                value={reminderDays}
                onChangeText={setReminderDays}
                placeholder="21"
                keyboardType="number-pad"
                inputMode="numeric"
                editable={!saving}
                error={errors.days}
              />
              <AppText variant="support" color="textSecondary" style={styles.hint}>
                Depois desse tempo sem voltar, a cliente aparece na sua lista de retorno.
              </AppText>
            </View>

            <View style={styles.field}>
              <TextField
                label="Agenda aberta por, em dias"
                value={windowDays}
                onChangeText={setWindowDays}
                placeholder="14"
                keyboardType="number-pad"
                inputMode="numeric"
                editable={!saving}
                error={errors.window}
              />
              <AppText variant="support" color="textSecondary" style={styles.hint}>
                Até quantos dias à frente a cliente consegue marcar. Janela curta evita você ficar
                presa a horário combinado antes de saber se poderá cumprir.
              </AppText>
            </View>

            <View style={styles.field}>
              <TextField
                label="Antecedência mínima, em horas"
                value={noticeHours}
                onChangeText={setNoticeHours}
                placeholder="3"
                keyboardType="number-pad"
                inputMode="numeric"
                editable={!saving}
                error={errors.notice}
              />
              <AppText variant="support" color="textSecondary" style={styles.hint}>
                Quanto tempo antes, no mínimo, a cliente pode marcar. Zero aceita encaixe para
                daqui a pouco.
              </AppText>
            </View>

            <View style={styles.footer}>
              <Button
                label={saving ? 'Salvando...' : 'Salvar preferências'}
                onPress={handleSave}
                disabled={saving}
              />
            </View>
          </>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: Spacing.three },
  inner: { width: '100%', maxWidth: MaxContentWidth, alignSelf: 'center' },
  messageCard: { marginBottom: Spacing.three },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing.three,
    gap: Spacing.three,
  },
  optionText: { flex: 1 },
  field: { marginTop: Spacing.four },
  hint: { marginTop: -Spacing.two },
  footer: { marginTop: Spacing.three },
});
