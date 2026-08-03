/**
 * O agendamento da cliente.
 *
 * O endereço desta tela contém o código do agendamento, e é ele que prova
 * que o horário é dela — não há senha (DT-004). Guardar o link é o que
 * permite voltar aqui depois.
 */

import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppText } from '@/components/app-text';
import { Button } from '@/components/button';
import { Card } from '@/components/card';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { getAppointment, type AppointmentDetails } from '@/lib/booking';
import { formatPrice } from '@/lib/format';

const STATUS_LABEL: Record<string, { title: string; detail: string }> = {
  pendente: {
    title: 'Pedido enviado',
    detail: 'A Yaya vai confirmar em breve. Você recebe um aviso pelo WhatsApp.',
  },
  confirmado: {
    title: 'Horário confirmado',
    detail: 'Está reservado pra você. Até lá!',
  },
  cancelado: {
    title: 'Agendamento cancelado',
    detail: 'Este horário não está mais reservado.',
  },
  concluido: {
    title: 'Atendimento concluído',
    detail: 'Esperamos você de novo em breve.',
  },
};

export default function AppointmentScreen() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();

  const [appointment, setAppointment] = useState<AppointmentDetails | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    getAppointment(id)
      .then((found) => active && setAppointment(found))
      .catch(() => {})
      .finally(() => active && setLoading(false));

    return () => {
      active = false;
    };
  }, [id]);

  if (loading) {
    return (
      <View style={[styles.centered, { backgroundColor: colors.background }]}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  if (!appointment) {
    return (
      <View style={[styles.centered, { backgroundColor: colors.background }]}>
        <View style={styles.message}>
          <AppText variant="heading">Agendamento não encontrado</AppText>
          <AppText variant="body" color="textSecondary" style={styles.spaced}>
            O link pode estar incompleto. Se você acha que tem um horário marcado, fale com a Yaya.
          </AppText>
          <Button label="Fazer um agendamento" onPress={() => router.replace('/')} />
        </View>
      </View>
    );
  }

  const label = STATUS_LABEL[appointment.status] ?? STATUS_LABEL.pendente;
  const starts = new Date(appointment.starts_at);
  const ends = new Date(appointment.ends_at);
  const hora = (d: Date) => d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

  return (
    <ScrollView
      style={{ backgroundColor: colors.background }}
      contentContainerStyle={[
        styles.content,
        { paddingTop: insets.top + Spacing.six, paddingBottom: insets.bottom + Spacing.five },
      ]}>
      <View style={styles.inner}>
        <AppText variant="title">{label.title}</AppText>
        <AppText variant="body" color="textSecondary" style={styles.spaced}>
          {label.detail}
        </AppText>

        <Card>
          <AppText variant="label" color="textSecondary">
            SERVIÇOS
          </AppText>
          <AppText variant="heading" style={styles.line}>
            {appointment.services}
          </AppText>

          <View style={[styles.divider, { borderTopColor: colors.border }]}>
            <AppText variant="label" color="textSecondary">
              QUANDO
            </AppText>
            <AppText variant="bodyBold" style={styles.line}>
              {starts.toLocaleDateString('pt-BR', {
                weekday: 'long',
                day: '2-digit',
                month: 'long',
              })}
            </AppText>
            <AppText variant="body" color="textSecondary">
              das {hora(starts)} às {hora(ends)}
            </AppText>
          </View>

          <View style={[styles.divider, { borderTopColor: colors.border }]}>
            <AppText variant="label" color="textSecondary">
              VALOR
            </AppText>
            <AppText variant="heading" color="textAccent" style={styles.line}>
              {formatPrice(appointment.price_cents)}
            </AppText>
          </View>
        </Card>

        <Card style={styles.tip}>
          <AppText variant="support" color="textSecondary">
            Guarde este link nos favoritos para consultar seu horário depois. Ele é o seu
            comprovante.
          </AppText>
        </Card>

        <View style={styles.footer}>
          <Button
            label="Marcar outro horário"
            variant="secondary"
            onPress={() => router.replace('/')}
          />
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: Spacing.three },
  message: { maxWidth: 420 },
  content: { paddingHorizontal: Spacing.three },
  inner: { width: '100%', maxWidth: MaxContentWidth, alignSelf: 'center' },
  spaced: { marginTop: Spacing.one, marginBottom: Spacing.four },
  line: { marginTop: Spacing.one },
  divider: { borderTopWidth: 1, marginTop: Spacing.three, paddingTop: Spacing.three },
  tip: { marginTop: Spacing.three },
  footer: { marginTop: Spacing.four },
});
