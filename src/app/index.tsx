/**
 * Agendamento pela cliente.
 *
 * Uma tela só, com as etapas aparecendo conforme ela avança: serviços, data,
 * horário, dados. Em celular, trocar de tela a cada passo faz perder o
 * contexto do que já foi escolhido — e voltar para corrigir vira aventura.
 */

import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppText } from '@/components/app-text';
import { Button } from '@/components/button';
import { Card } from '@/components/card';
import { TextField } from '@/components/text-field';
import { MaxContentWidth, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import {
  bookAppointment,
  getPublicRules,
  listAvailableSlots,
  listOpenDates,
  rememberAppointment,
  servicesExtent,
} from '@/lib/booking';
import { todayISO, type ISODate } from '@/lib/calendar';
import { WEEKDAYS, formatDuration, formatPrice } from '@/lib/format';
import { finalPriceCents, hasDiscount } from '@/lib/pricing';
import { listGalleryPhotos, type GalleryPhoto } from '@/lib/photos';
import { listActiveServices, type Service } from '@/lib/services';

export default function BookingScreen() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const today = todayISO();

  const [services, setServices] = useState<Service[] | null>(null);
  const [openDates, setOpenDates] = useState<ISODate[]>([]);
  const [chosen, setChosen] = useState<string[]>([]);
  const [date, setDate] = useState<ISODate | null>(null);
  const [slots, setSlots] = useState<string[] | null>(null);
  const [slot, setSlot] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [total, setTotal] = useState({ duration_minutes: 0, buffer_minutes: 0 });
  const [gallery, setGallery] = useState<GalleryPhoto[]>([]);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    Promise.all([listActiveServices(), getPublicRules()])
      .then(async ([list, rules]) => {
        if (!active) return;

        setServices(list);
        setOpenDates(await listOpenDates(rules.booking_window_days));

        // A vitrine é enfeite: se falhar, a cliente ainda precisa conseguir
        // agendar. Por isso vem depois e não derruba a tela.
        listGalleryPhotos()
          .then((photos) => active && setGallery(photos))
          .catch(() => {});
      })
      .catch((cause: Error) => active && setError(cause.message));

    return () => {
      active = false;
    };
  }, []);

  // Trocar de serviço muda a duração, então o horário escolhido pode não caber
  // mais. Limpar é mais honesto que manter uma escolha que virou inválida.
  useEffect(() => {
    setSlot(null);
    setSlots(null);

    if (chosen.length === 0) {
      setTotal({ duration_minutes: 0, buffer_minutes: 0 });
      return;
    }

    let active = true;
    servicesExtent(chosen).then((extent) => active && setTotal(extent));

    return () => {
      active = false;
    };
  }, [chosen]);

  const loadSlots = useCallback(
    async (forDate: ISODate) => {
      setSlots(null);
      setSlot(null);

      try {
        setSlots(await listAvailableSlots(chosen, forDate));
      } catch (cause) {
        setError((cause as Error).message);
      }
    },
    [chosen],
  );

  function toggleService(id: string) {
    setChosen((current) =>
      current.includes(id) ? current.filter((x) => x !== id) : [...current, id],
    );
  }

  const chosenServices = (services ?? []).filter((s) => chosen.includes(s.id));
  const totalPrice = chosenServices.reduce((sum, s) => sum + finalPriceCents(s, today), 0);

  async function handleConfirm() {
    if (!slot) return;

    setSending(true);
    setError(null);

    try {
      const id = await bookAppointment(chosen, slot, name, phone);
      await rememberAppointment(id);
      router.replace(`/agendamento/${id}`);
    } catch (cause) {
      setError((cause as Error).message);
      setSending(false);
      // O horário pode ter sido tomado no meio do preenchimento: recarrega para
      // ela não insistir num que não existe mais.
      if (date) loadSlots(date);
    }
  }

  const timeOf = (iso: string) =>
    new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

  return (
    <ScrollView
      style={{ backgroundColor: colors.background }}
      contentContainerStyle={[
        styles.content,
        { paddingTop: insets.top + Spacing.four, paddingBottom: insets.bottom + Spacing.five },
      ]}
      keyboardShouldPersistTaps="handled">
      <View style={styles.inner}>
        <AppText variant="title">Yaya Kawaii Nails</AppText>
        <AppText variant="body" color="textSecondary" style={styles.subtitle}>
          Escolha o que você quer fazer e o melhor horário pra você.
        </AppText>

        {error ? (
          <Card style={styles.errorCard}>
            <AppText variant="support" color="textAccent">
              {error}
            </AppText>
          </Card>
        ) : null}

        {gallery.length > 0 ? (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.gallery}>
            <View style={styles.galleryRow}>
              {gallery.map((photo) => (
                <Image
                  key={photo.id}
                  source={{ uri: photo.url }}
                  style={styles.galleryPhoto}
                  contentFit="cover"
                  transition={200}
                  accessibilityLabel={photo.caption ?? 'Trabalho da Yaya'}
                />
              ))}
            </View>
          </ScrollView>
        ) : null}

        <Step number={1} title="O que você quer fazer" />

        {services === null ? (
          <ActivityIndicator color={colors.primary} />
        ) : (
          <Card>
            {services.map((service, index) => {
              const selected = chosen.includes(service.id);

              return (
                <Pressable
                  key={service.id}
                  accessibilityRole="checkbox"
                  aria-checked={selected}
                  accessibilityLabel={service.name}
                  onPress={() => toggleService(service.id)}
                  style={({ pressed }) => [
                    styles.serviceRow,
                    index > 0 && { borderTopWidth: 1, borderTopColor: colors.border },
                    pressed && { opacity: 0.6 },
                  ]}>
                  <View
                    style={[
                      styles.check,
                      {
                        borderColor: selected ? colors.primary : colors.border,
                        backgroundColor: selected ? colors.primary : 'transparent',
                      },
                    ]}>
                    {selected ? (
                      <AppText variant="label" color="onPrimary">
                        ✓
                      </AppText>
                    ) : null}
                  </View>

                  <View style={styles.serviceInfo}>
                    <AppText variant="bodyBold">{service.name}</AppText>
                    {service.description ? (
                      <AppText variant="support" color="textSecondary">
                        {service.description}
                      </AppText>
                    ) : null}
                    <AppText variant="support" color="textSecondary">
                      {formatDuration(service.duration_minutes)}
                    </AppText>
                  </View>

                  <View style={styles.priceColumn}>
                    {hasDiscount(service, today) ? (
                      <AppText variant="support" color="textSecondary" style={styles.struck}>
                        {formatPrice(service.price_cents)}
                      </AppText>
                    ) : null}
                    <AppText variant="bodyBold" color="textAccent">
                      {formatPrice(finalPriceCents(service, today))}
                    </AppText>
                  </View>
                </Pressable>
              );
            })}
          </Card>
        )}

        {chosen.length > 0 ? (
          <Card style={styles.summary}>
            <AppText variant="bodyBold">
              {chosen.length === 1 ? '1 serviço' : `${chosen.length} serviços`} ·{' '}
              {formatDuration(total.duration_minutes)}
            </AppText>
            <AppText variant="support" color="textSecondary">
              Total {formatPrice(totalPrice)}
            </AppText>
          </Card>
        ) : null}

        {chosen.length > 0 ? (
          <>
            <Step number={2} title="Que dia" />

            {openDates.length === 0 ? (
              <Card>
                <AppText variant="body" color="textSecondary">
                  Não há datas abertas no momento. Fale com a Yaya pelo WhatsApp.
                </AppText>
              </Card>
            ) : (
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View style={styles.dateRow}>
                  {openDates.map((option) => {
                    const active = date === option;
                    const day = Number(option.slice(8));
                    const weekday = WEEKDAYS[new Date(`${option}T12:00:00`).getDay()];

                    return (
                      <Pressable
                        key={option}
                        accessibilityRole="button"
                        accessibilityState={{ selected: active }}
                        onPress={() => {
                          setDate(option);
                          loadSlots(option);
                        }}
                        style={[
                          styles.dateChip,
                          {
                            backgroundColor: active ? colors.primary : colors.surface,
                            borderColor: active ? colors.primary : colors.border,
                          },
                        ]}>
                        <AppText variant="label" color={active ? 'onPrimary' : 'textSecondary'}>
                          {weekday.slice(0, 3)}
                        </AppText>
                        <AppText variant="bodyBold" color={active ? 'onPrimary' : 'textPrimary'}>
                          {day}
                        </AppText>
                      </Pressable>
                    );
                  })}
                </View>
              </ScrollView>
            )}
          </>
        ) : null}

        {date ? (
          <>
            <Step number={3} title="Que horas" />

            {slots === null ? (
              <ActivityIndicator color={colors.primary} />
            ) : slots.length === 0 ? (
              <Card>
                <AppText variant="body" color="textSecondary">
                  Nenhum horário livre nesse dia para o que você escolheu. Tente outra data, ou
                  menos serviços de uma vez.
                </AppText>
              </Card>
            ) : (
              <View style={styles.slotGrid}>
                {slots.map((option) => {
                  const active = slot === option;

                  return (
                    <Pressable
                      key={option}
                      accessibilityRole="button"
                      accessibilityState={{ selected: active }}
                      onPress={() => setSlot(option)}
                      style={[
                        styles.slotChip,
                        {
                          backgroundColor: active ? colors.primary : colors.surface,
                          borderColor: active ? colors.primary : colors.border,
                        },
                      ]}>
                      <AppText variant="label" color={active ? 'onPrimary' : 'textPrimary'}>
                        {timeOf(option)}
                      </AppText>
                    </Pressable>
                  );
                })}
              </View>
            )}
          </>
        ) : null}

        {slot ? (
          <>
            <Step number={4} title="Seus dados" />

            <TextField
              label="Seu nome"
              value={name}
              onChangeText={setName}
              placeholder="Como você quer ser chamada"
              editable={!sending}
            />
            <TextField
              label="Seu telefone"
              value={phone}
              onChangeText={setPhone}
              placeholder="(11) 99999-0000"
              keyboardType="phone-pad"
              inputMode="tel"
              editable={!sending}
            />

            <Card style={styles.confirmCard}>
              <AppText variant="bodyBold">
                {chosenServices.map((s) => s.name).join(' + ')}
              </AppText>
              <AppText variant="support" color="textSecondary" style={styles.confirmLine}>
                {date ? new Date(`${date}T12:00:00`).toLocaleDateString('pt-BR') : ''} às{' '}
                {timeOf(slot)} · {formatDuration(total.duration_minutes)}
              </AppText>
              <AppText variant="heading" color="textAccent">
                {formatPrice(totalPrice)}
              </AppText>
            </Card>

            <Button
              label={sending ? 'Agendando...' : 'Confirmar agendamento'}
              onPress={handleConfirm}
              disabled={sending}
            />
          </>
        ) : null}

        <Pressable
          accessibilityRole="link"
          onPress={() => router.push('/entrar')}
          style={styles.ownerLink}>
          <AppText variant="support" color="textSecondary">
            Sou a Yaya
          </AppText>
        </Pressable>
      </View>
    </ScrollView>
  );
}

function Step({ number, title }: { number: number; title: string }) {
  const { colors } = useTheme();

  return (
    <View style={styles.step}>
      <View style={[styles.stepNumber, { backgroundColor: colors.secondary }]}>
        <AppText variant="label" color="onPrimary">
          {number}
        </AppText>
      </View>
      <AppText variant="subheading">{title}</AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: Spacing.three },
  inner: { width: '100%', maxWidth: MaxContentWidth, alignSelf: 'center' },
  subtitle: { marginTop: Spacing.one },
  gallery: { marginTop: Spacing.four },
  galleryRow: { flexDirection: 'row', gap: Spacing.two },
  galleryPhoto: { width: 150, height: 150, borderRadius: Radius.medium },
  errorCard: { marginTop: Spacing.three },
  step: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    marginTop: Spacing.five,
    marginBottom: Spacing.two,
  },
  stepNumber: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  serviceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    paddingVertical: Spacing.three,
  },
  check: {
    width: 24,
    height: 24,
    borderRadius: 7,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  serviceInfo: { flex: 1 },
  priceColumn: { alignItems: 'flex-end' },
  struck: { textDecorationLine: 'line-through' },
  summary: { marginTop: Spacing.three },
  dateRow: { flexDirection: 'row', gap: Spacing.two, paddingVertical: Spacing.one },
  dateChip: {
    width: 58,
    paddingVertical: Spacing.three,
    borderRadius: Radius.medium,
    borderWidth: 1,
    alignItems: 'center',
  },
  slotGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two },
  slotChip: {
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    borderRadius: Radius.pill,
    borderWidth: 1,
  },
  confirmCard: { marginBottom: Spacing.three },
  confirmLine: { marginTop: Spacing.one, marginBottom: Spacing.two },
  ownerLink: { marginTop: Spacing.six, alignSelf: 'center', padding: Spacing.two },
});
