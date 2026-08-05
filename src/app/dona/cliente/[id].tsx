/**
 * Ficha e histórico da cliente.
 *
 * Sem dado de saúde: a anamnese fica no papel (DT-010). Observações e
 * preferências são anotações de atendimento, não prontuário.
 */

import { useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppText } from '@/components/app-text';
import { Button } from '@/components/button';
import { Card } from '@/components/card';
import { ScreenHeader } from '@/components/screen-header';
import { TextField } from '@/components/text-field';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { formatISODate, parseBRDate } from '@/lib/calendar';
import {
  formatPhone,
  getClient,
  listVisits,
  updateClient,
  type ClientDetails,
  type ClientVisit,
} from '@/lib/clients';
import { formatPrice } from '@/lib/format';

const STATUS_LABEL: Record<string, string> = {
  pendente: 'Aguardando aprovação',
  confirmado: 'Confirmado',
  cancelado: 'Cancelado',
  concluido: 'Concluído',
};

export default function ClientScreen() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();

  const [client, setClient] = useState<ClientDetails | null>(null);
  const [visits, setVisits] = useState<ClientVisit[]>([]);
  const [loading, setLoading] = useState(true);

  const [name, setName] = useState('');
  const [birthday, setBirthday] = useState('');
  const [preferences, setPreferences] = useState('');
  const [notes, setNotes] = useState('');

  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [dateError, setDateError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    Promise.all([getClient(id), listVisits(id)])
      .then(([found, history]) => {
        if (!active || !found) return;

        setClient(found);
        setVisits(history);
        setName(found.name);
        setBirthday(found.birth_date ? formatISODate(found.birth_date) : '');
        setPreferences(found.preferences ?? '');
        setNotes(found.notes ?? '');
      })
      .catch((cause: Error) => active && setMessage(cause.message))
      .finally(() => active && setLoading(false));

    return () => {
      active = false;
    };
  }, [id]);

  async function handleSave() {
    if (!name.trim()) {
      setMessage('O nome não pode ficar vazio.');
      return;
    }

    // Campo vazio limpa o aniversário; preenchido precisa ser data válida.
    const birthISO = birthday.trim() ? parseBRDate(birthday) : null;

    if (birthday.trim() && !birthISO) {
      setDateError('Use o formato 24/03/1990.');
      return;
    }

    setDateError(null);
    setSaving(true);
    setMessage(null);

    try {
      await updateClient(id, {
        name: name.trim(),
        birth_date: birthISO,
        preferences: preferences.trim() || null,
        notes: notes.trim() || null,
      });
      setMessage('Ficha salva.');
    } catch (cause) {
      setMessage((cause as Error).message);
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <View style={[styles.centered, { backgroundColor: colors.background }]}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  if (!client) {
    return (
      <View style={[styles.centered, { backgroundColor: colors.background }]}>
        <AppText variant="heading">Cliente não encontrada</AppText>
      </View>
    );
  }

  const attended = visits.filter((v) => v.status === 'concluido');
  const spent = attended.reduce((sum, v) => sum + v.price_cents, 0);

  return (
    <ScrollView
      style={{ backgroundColor: colors.background }}
      contentContainerStyle={[
        styles.content,
        { paddingTop: insets.top + Spacing.three, paddingBottom: insets.bottom + Spacing.five },
      ]}
      keyboardShouldPersistTaps="handled">
      <View style={styles.inner}>
        <ScreenHeader title={client.name} subtitle={formatPhone(client.phone)} />

        {message ? (
          <Card style={styles.messageCard}>
            <AppText variant="support" color="textAccent">
              {message}
            </AppText>
          </Card>
        ) : null}

        {attended.length > 0 ? (
          <Card style={styles.summary}>
            <AppText variant="bodyBold">
              {attended.length} atendimento{attended.length > 1 ? 's' : ''} concluído
              {attended.length > 1 ? 's' : ''}
            </AppText>
            <AppText variant="support" color="textSecondary">
              {formatPrice(spent)} no total
            </AppText>
          </Card>
        ) : null}

        <AppText variant="label" color="textSecondary" style={styles.section}>
          FICHA
        </AppText>

        <TextField label="Nome" value={name} onChangeText={setName} editable={!saving} />

        <TextField
          label="Aniversário"
          value={birthday}
          onChangeText={setBirthday}
          placeholder="24/03/1990"
          editable={!saving}
          error={dateError}
        />

        <TextField
          label="Preferências de unha"
          value={preferences}
          onChangeText={setPreferences}
          placeholder="Formato, tamanho, cores que ela gosta"
          multiline
          numberOfLines={3}
          style={styles.multiline}
          editable={!saving}
        />

        <TextField
          label="Observações"
          value={notes}
          onChangeText={setNotes}
          placeholder="O que você quiser lembrar sobre ela"
          multiline
          numberOfLines={3}
          style={styles.multiline}
          editable={!saving}
        />

        <Button
          label={saving ? 'Salvando...' : 'Salvar ficha'}
          onPress={handleSave}
          disabled={saving}
        />

        <AppText variant="label" color="textSecondary" style={styles.section}>
          HISTÓRICO
        </AppText>

        {visits.length === 0 ? (
          <Card>
            <AppText variant="body" color="textSecondary">
              Nenhum atendimento registrado ainda.
            </AppText>
          </Card>
        ) : (
          <Card>
            {visits.map((visit, index) => {
              const when = new Date(visit.starts_at);
              const cancelled = visit.status === 'cancelado';

              return (
                <View
                  key={visit.id}
                  style={[
                    styles.visit,
                    index > 0 && { borderTopWidth: 1, borderTopColor: colors.border },
                  ]}>
                  <View style={styles.grow}>
                    <AppText
                      variant="bodyBold"
                      color={cancelled ? 'textSecondary' : 'textPrimary'}
                      style={cancelled ? styles.struck : undefined}>
                      {visit.services.join(' + ') || 'Sem serviço registrado'}
                    </AppText>
                    <AppText variant="support" color="textSecondary">
                      {when.toLocaleDateString('pt-BR')} ·{' '}
                      {when.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })} ·{' '}
                      {STATUS_LABEL[visit.status] ?? visit.status}
                    </AppText>
                  </View>
                  <AppText
                    variant="bodyBold"
                    color={cancelled ? 'textSecondary' : 'textAccent'}>
                    {formatPrice(visit.price_cents)}
                  </AppText>
                </View>
              );
            })}
          </Card>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: Spacing.three },
  content: { paddingHorizontal: Spacing.three },
  inner: { width: '100%', maxWidth: MaxContentWidth, alignSelf: 'center' },
  messageCard: { marginBottom: Spacing.three },
  summary: { marginBottom: Spacing.three },
  section: { marginTop: Spacing.five, marginBottom: Spacing.two, letterSpacing: 1 },
  multiline: { minHeight: 88, textAlignVertical: 'top', paddingTop: Spacing.three },
  visit: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    paddingVertical: Spacing.three,
  },
  grow: { flex: 1 },
  struck: { textDecorationLine: 'line-through' },
});
