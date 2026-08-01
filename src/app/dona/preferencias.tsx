/**
 * Preferências do salão.
 *
 * São chaves e não regra fixa no código (DT-008): a dona começa aprovando
 * tudo e desliga quando cansar, sem depender de alteração no app.
 */

import { useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Switch, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppText } from '@/components/app-text';
import { Button } from '@/components/button';
import { Card } from '@/components/card';
import { ScreenHeader } from '@/components/screen-header';
import { TextField } from '@/components/text-field';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { getSettings, updateSettings, type Settings } from '@/lib/settings';

export default function PreferencesScreen() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();

  const [settings, setSettings] = useState<Settings | null>(null);
  const [reminderDays, setReminderDays] = useState('');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [daysError, setDaysError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    getSettings()
      .then((data) => {
        if (!active || !data) return;

        setSettings(data);
        setReminderDays(String(data.maintenance_reminder_days));
      })
      .catch((cause: Error) => active && setMessage(cause.message));

    return () => {
      active = false;
    };
  }, []);

  async function handleSave() {
    if (!settings) return;

    const days = Number(reminderDays);

    if (!Number.isInteger(days) || days <= 0) {
      setDaysError('Um número de dias maior que zero.');
      return;
    }

    setDaysError(null);
    setSaving(true);
    setMessage(null);

    try {
      await updateSettings({ ...settings, maintenance_reminder_days: days });
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
                <Switch
                  value={settings.require_approval}
                  onValueChange={(require_approval) =>
                    setSettings({ ...settings, require_approval })
                  }
                  accessibilityLabel="Aprovar cada agendamento"
                  trackColor={{ true: colors.primary, false: colors.border }}
                  thumbColor={colors.surface}
                />
              </View>

              <View style={[styles.option, { borderTopWidth: 1, borderTopColor: colors.border }]}>
                <View style={styles.optionText}>
                  <AppText variant="bodyBold">Cliente pode cancelar sozinha</AppText>
                  <AppText variant="support" color="textSecondary">
                    Desligado, ela precisa falar com você para desmarcar.
                  </AppText>
                </View>
                <Switch
                  value={settings.allow_client_cancel}
                  onValueChange={(allow_client_cancel) =>
                    setSettings({ ...settings, allow_client_cancel })
                  }
                  accessibilityLabel="Cliente pode cancelar sozinha"
                  trackColor={{ true: colors.primary, false: colors.border }}
                  thumbColor={colors.surface}
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
                error={daysError}
              />
              <AppText variant="support" color="textSecondary" style={styles.hint}>
                Depois desse tempo sem voltar, a cliente aparece na sua lista de retorno.
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
