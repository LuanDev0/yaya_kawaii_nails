/**
 * Lançamento de agendamento pela dona.
 *
 * O caso da cliente que combinou por WhatsApp e não vai abrir link nenhum.
 * Segue as mesmas regras da cliente por padrão; com "escolher outro horário",
 * ela fura — e o app diz o que está furando antes de confirmar.
 */

import { useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppText } from '@/components/app-text';
import { Button } from '@/components/button';
import { Card } from '@/components/card';
import { OwnerModeSwitch } from '@/components/owner-mode-switch';
import { TextField } from '@/components/text-field';
import { MaxContentWidth, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import {
  bookAsOwner,
  getPublicRules,
  listAvailableSlots,
  listOpenDates,
  servicesExtent,
  slotWarnings,
} from '@/lib/booking';
import { addDaysISO, formatISODate, parseBRDate, todayISO, type ISODate } from '@/lib/calendar';
import { formatPhone, listClients, type Client } from '@/lib/clients';
import { WEEKDAYS, formatDuration, formatPrice, parseTime } from '@/lib/format';
import { finalPriceCents } from '@/lib/pricing';
import { listActiveServices, type Service } from '@/lib/services';

export default function OwnerBookingScreen() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const today = todayISO();

  const [services, setServices] = useState<Service[] | null>(null);
  const [clients, setClients] = useState<Client[]>([]);
  const [openDates, setOpenDates] = useState<ISODate[]>([]);
  const [chosen, setChosen] = useState<string[]>([]);
  const [date, setDate] = useState<ISODate | null>(null);
  const [slots, setSlots] = useState<string[] | null>(null);
  const [slot, setSlot] = useState<string | null>(null);
  const [total, setTotal] = useState({ duration_minutes: 0, buffer_minutes: 0 });

  const [forcing, setForcing] = useState(false);
  const [freeDate, setFreeDate] = useState('');
  const [freeTime, setFreeTime] = useState('');
  const [warnings, setWarnings] = useState<string[]>([]);

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    Promise.all([listActiveServices(), getPublicRules(), listClients()])
      .then(async ([list, rules, people]) => {
        if (!active) return;

        setServices(list);
        setClients(people);
        setOpenDates(await listOpenDates(rules.booking_window_days));
      })
      .catch((cause: Error) => active && setError(cause.message));

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    setSlot(null);
    setSlots(null);
    setWarnings([]);

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

  /** Monta o instante a partir do que ela digitou, no fuso do aparelho. */
  function forcedInstant(): string | null {
    const iso = parseBRDate(freeDate);
    const time = parseTime(freeTime);
    if (!iso || !time) return null;

    return new Date(`${iso}T${time}:00`).toISOString();
  }

  /** Pergunta ao banco o que está sendo furado, para avisar antes de gravar. */
  async function checkForced() {
    const instant = forcedInstant();
    setError(null);

    if (!instant) {
      setWarnings([]);
      setError('Data no formato 31/05/2026 e hora no formato 14:00.');
      return;
    }

    try {
      setWarnings(await slotWarnings(chosen, instant));
      setSlot(instant);
    } catch (cause) {
      setError((cause as Error).message);
    }
  }

  function toggleService(id: string) {
    setChosen((current) =>
      current.includes(id) ? current.filter((x) => x !== id) : [...current, id],
    );
  }

  const chosenServices = (services ?? []).filter((s) => chosen.includes(s.id));
  const totalPrice = chosenServices.reduce((sum, s) => sum + finalPriceCents(s, today), 0);
  const blocked = warnings.some((w) => w.includes('Choca com outro'));

  async function handleConfirm() {
    if (!slot) return;

    setSending(true);
    setError(null);

    try {
      const id = await bookAsOwner(chosen, slot, name, phone, forcing);
      router.replace(`/agendamento/${id}`);
    } catch (cause) {
      setError((cause as Error).message);
      setSending(false);
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
        <OwnerModeSwitch />

        <AppText variant="title">Novo agendamento</AppText>
        <AppText variant="support" color="textSecondary" style={styles.subtitle}>
          Para quem combinou com você por fora e não vai usar o link.
        </AppText>

        {error ? (
          <Card style={styles.errorCard}>
            <AppText variant="support" color="textAccent">
              {error}
            </AppText>
          </Card>
        ) : null}

        <AppText variant="label" color="textSecondary" style={styles.section}>
          SERVIÇOS
        </AppText>

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
                    styles.row,
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
                  <AppText variant="bodyBold" style={styles.grow}>
                    {service.name}
                  </AppText>
                  <AppText variant="support" color="textSecondary">
                    {formatDuration(service.duration_minutes)}
                  </AppText>
                </Pressable>
              );
            })}
          </Card>
        )}

        {chosen.length > 0 ? (
          <>
            <Card style={styles.summary}>
              <AppText variant="bodyBold">
                {formatDuration(total.duration_minutes)} de atendimento
                {total.buffer_minutes > 0 ? ` + ${total.buffer_minutes}min de arrumação` : ''}
              </AppText>
              <AppText variant="support" color="textSecondary">
                Total {formatPrice(totalPrice)}
              </AppText>
            </Card>

            <View style={styles.modeRow}>
              <Pressable
                accessibilityRole="button"
                accessibilityState={{ selected: !forcing }}
                onPress={() => {
                  setForcing(false);
                  setWarnings([]);
                  setSlot(null);
                }}
                style={[
                  styles.modeOption,
                  {
                    backgroundColor: !forcing ? colors.primary : 'transparent',
                    borderColor: !forcing ? colors.primary : colors.border,
                  },
                ]}>
                <AppText variant="label" color={!forcing ? 'onPrimary' : 'textSecondary'}>
                  Horários livres
                </AppText>
              </Pressable>

              <Pressable
                accessibilityRole="button"
                accessibilityState={{ selected: forcing }}
                onPress={() => {
                  setForcing(true);
                  setSlot(null);
                  setFreeDate(date ? formatISODate(date) : formatISODate(addDaysISO(today, 1)));
                }}
                style={[
                  styles.modeOption,
                  {
                    backgroundColor: forcing ? colors.primary : 'transparent',
                    borderColor: forcing ? colors.primary : colors.border,
                  },
                ]}>
                <AppText variant="label" color={forcing ? 'onPrimary' : 'textSecondary'}>
                  Escolher outro horário
                </AppText>
              </Pressable>
            </View>
          </>
        ) : null}

        {chosen.length > 0 && !forcing ? (
          <>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={styles.dateRow}>
                {openDates.map((option) => {
                  const active = date === option;

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
                        {WEEKDAYS[new Date(`${option}T12:00:00`).getDay()].slice(0, 3)}
                      </AppText>
                      <AppText variant="bodyBold" color={active ? 'onPrimary' : 'textPrimary'}>
                        {Number(option.slice(8))}
                      </AppText>
                    </Pressable>
                  );
                })}
              </View>
            </ScrollView>

            {date && slots === null ? <ActivityIndicator color={colors.primary} /> : null}

            {slots?.length === 0 ? (
              <Card style={styles.summary}>
                <AppText variant="support" color="textSecondary">
                  Nenhum horário livre nesse dia. Use "escolher outro horário" para encaixar.
                </AppText>
              </Card>
            ) : null}

            {slots && slots.length > 0 ? (
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
            ) : null}
          </>
        ) : null}

        {chosen.length > 0 && forcing ? (
          <>
            <View style={styles.freeRow}>
              <View style={styles.grow}>
                <TextField
                  label="Data"
                  value={freeDate}
                  onChangeText={setFreeDate}
                  placeholder="31/05/2026"
                  editable={!sending}
                />
              </View>
              <View style={styles.grow}>
                <TextField
                  label="Hora"
                  value={freeTime}
                  onChangeText={setFreeTime}
                  placeholder="14:00"
                  editable={!sending}
                />
              </View>
            </View>

            <Button label="Conferir horário" variant="secondary" onPress={checkForced} />

            {slot ? (
              <Card
                style={[
                  styles.summary,
                  { borderColor: warnings.length > 0 ? colors.blush : colors.border },
                ]}>
                {warnings.length === 0 ? (
                  <AppText variant="bodyBold">
                    Horário limpo — não fura nenhuma regra.
                  </AppText>
                ) : (
                  <>
                    <AppText variant="bodyBold">Este horário fura:</AppText>
                    {warnings.map((w) => (
                      <AppText key={w} variant="support" color="textAccent" style={styles.warning}>
                        • {w}
                      </AppText>
                    ))}
                    {blocked ? (
                      <AppText variant="support" color="textSecondary" style={styles.warning}>
                        Sobreposição o banco recusa mesmo forçando. Escolha outro horário.
                      </AppText>
                    ) : null}
                  </>
                )}
              </Card>
            ) : null}
          </>
        ) : null}

        {slot && !blocked ? (
          <>
            <AppText variant="label" color="textSecondary" style={styles.section}>
              CLIENTE
            </AppText>

            {clients.length > 0 ? (
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View style={styles.dateRow}>
                  {clients.map((client) => (
                    <Pressable
                      key={client.id}
                      accessibilityRole="button"
                      onPress={() => {
                        setName(client.name);
                        setPhone(formatPhone(client.phone));
                      }}
                      style={[
                        styles.clientChip,
                        { backgroundColor: colors.surface, borderColor: colors.border },
                      ]}>
                      <AppText variant="label">{client.name}</AppText>
                    </Pressable>
                  ))}
                </View>
              </ScrollView>
            ) : null}

            <TextField
              label="Nome"
              value={name}
              onChangeText={setName}
              placeholder="Nome da cliente"
              editable={!sending}
            />
            <TextField
              label="Telefone"
              value={phone}
              onChangeText={setPhone}
              placeholder="(11) 99999-0000"
              keyboardType="phone-pad"
              inputMode="tel"
              editable={!sending}
            />

            <Card style={styles.confirmCard}>
              <AppText variant="bodyBold">{chosenServices.map((s) => s.name).join(' + ')}</AppText>
              <AppText variant="support" color="textSecondary" style={styles.warning}>
                {new Date(slot).toLocaleDateString('pt-BR')} às {timeOf(slot)} ·{' '}
                {formatDuration(total.duration_minutes)}
              </AppText>
              <AppText variant="heading" color="textAccent">
                {formatPrice(totalPrice)}
              </AppText>
            </Card>

            <Button
              label={sending ? 'Lançando...' : 'Lançar agendamento'}
              onPress={handleConfirm}
              disabled={sending}
            />
          </>
        ) : null}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: Spacing.three },
  inner: { width: '100%', maxWidth: MaxContentWidth, alignSelf: 'center' },
  subtitle: { marginTop: Spacing.one },
  errorCard: { marginTop: Spacing.three },
  section: { marginTop: Spacing.five, marginBottom: Spacing.two, letterSpacing: 1 },
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three, paddingVertical: Spacing.three },
  check: {
    width: 24,
    height: 24,
    borderRadius: 7,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  grow: { flex: 1 },
  summary: { marginTop: Spacing.three },
  modeRow: { flexDirection: 'row', gap: Spacing.two, marginTop: Spacing.four, marginBottom: Spacing.three },
  modeOption: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: Spacing.two,
    borderRadius: Radius.pill,
    borderWidth: 1,
  },
  dateRow: { flexDirection: 'row', gap: Spacing.two, paddingVertical: Spacing.one },
  dateChip: {
    width: 58,
    paddingVertical: Spacing.three,
    borderRadius: Radius.medium,
    borderWidth: 1,
    alignItems: 'center',
  },
  clientChip: {
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    borderRadius: Radius.pill,
    borderWidth: 1,
  },
  slotGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two, marginTop: Spacing.three },
  slotChip: {
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    borderRadius: Radius.pill,
    borderWidth: 1,
  },
  freeRow: { flexDirection: 'row', gap: Spacing.three },
  warning: { marginTop: Spacing.one },
  confirmCard: { marginTop: Spacing.three, marginBottom: Spacing.three },
});
