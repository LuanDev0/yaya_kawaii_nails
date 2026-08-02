/** Cadastro e edição de serviço. `id` vale "novo" para criar. */

import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppText } from '@/components/app-text';
import { Button } from '@/components/button';
import { Card } from '@/components/card';
import { ScreenHeader } from '@/components/screen-header';
import { TextField } from '@/components/text-field';
import { MaxContentWidth, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { addMinutes, formatDuration, formatPrice, parsePrice } from '@/lib/format';
import { finalPriceCents } from '@/lib/pricing';
import { createService, getService, listAllServices, updateService } from '@/lib/services';

export default function ServiceFormScreen() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();

  const isNew = id === 'novo';

  const [name, setName] = useState('');
  const [price, setPrice] = useState('');
  const [duration, setDuration] = useState('');
  const [buffer, setBuffer] = useState('0');
  const [discountKind, setDiscountKind] = useState<'nenhum' | 'valor' | 'percentual'>('nenhum');
  const [discountValue, setDiscountValue] = useState('');
  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (isNew) return;

    let active = true;

    getService(id)
      .then((service) => {
        if (!active || !service) return;

        setName(service.name);
        setPrice((service.price_cents / 100).toFixed(2).replace('.', ','));
        setDuration(String(service.duration_minutes));
        setBuffer(String(service.buffer_minutes));
        setDiscountKind(service.discount_kind ?? 'nenhum');
        setDiscountValue(
          service.discount_kind === 'valor'
            ? ((service.discount_value ?? 0) / 100).toFixed(2).replace('.', ',')
            : service.discount_value
              ? String(service.discount_value)
              : '',
        );
      })
      .catch((cause: Error) => active && setErrors({ form: cause.message }))
      .finally(() => active && setLoading(false));

    return () => {
      active = false;
    };
  }, [id, isNew]);

  const priceCents = parsePrice(price);
  const durationMinutes = Number(duration);
  const durationValid = Number.isInteger(durationMinutes) && durationMinutes > 0;
  const bufferMinutes = Number(buffer || '0');
  const bufferValid = Number.isInteger(bufferMinutes) && bufferMinutes >= 0;

  // Em centavos quando é valor; de 1 a 100 quando é porcentagem.
  const discountParsed =
    discountKind === 'nenhum'
      ? null
      : discountKind === 'valor'
        ? parsePrice(discountValue)
        : Number.isInteger(Number(discountValue)) && Number(discountValue) > 0
          ? Number(discountValue)
          : null;

  const discountOk =
    discountKind === 'nenhum' ||
    (discountParsed !== null &&
      discountParsed > 0 &&
      (discountKind === 'valor' || discountParsed <= 100));

  const preview =
    priceCents !== null && discountOk
      ? finalPriceCents({
          price_cents: priceCents,
          discount_kind: discountKind === 'nenhum' ? null : discountKind,
          discount_value: discountParsed,
        })
      : null;

  async function handleSave() {
    const found: Record<string, string> = {};

    if (!name.trim()) found.name = 'Dê um nome ao serviço.';
    if (priceCents === null) found.price = 'Preço inválido. Escreva algo como 120,00.';
    if (!durationValid) found.duration = 'Duração em minutos, um número maior que zero.';
    if (!bufferValid) found.buffer = 'Minutos de arrumação, zero ou mais.';
    if (!discountOk) {
      found.discount =
        discountKind === 'valor'
          ? 'Valor do desconto inválido. Escreva algo como 20,00.'
          : 'Porcentagem de 1 a 100.';
    }

    setErrors(found);
    if (Object.keys(found).length > 0) return;

    setSaving(true);

    try {
      if (isNew) {
        // Entra no fim da lista; a ordem é ajustável depois.
        const existing = await listAllServices();
        const nextOrder = Math.max(0, ...existing.map((s) => s.sort_order)) + 1;

        await createService({
          name: name.trim(),
          price_cents: priceCents!,
          discount_kind: discountKind === 'nenhum' ? null : discountKind,
          discount_value: discountKind === 'nenhum' ? null : discountParsed,
          duration_minutes: durationMinutes,
          buffer_minutes: bufferMinutes,
          active: true,
          sort_order: nextOrder,
        });
      } else {
        await updateService(id, {
          name: name.trim(),
          price_cents: priceCents!,
          discount_kind: discountKind === 'nenhum' ? null : discountKind,
          discount_value: discountKind === 'nenhum' ? null : discountParsed,
          duration_minutes: durationMinutes,
          buffer_minutes: bufferMinutes,
        });
      }

      router.back();
    } catch (cause) {
      setErrors({ form: (cause as Error).message });
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

  return (
    <ScrollView
      style={{ backgroundColor: colors.background }}
      contentContainerStyle={[
        styles.content,
        { paddingTop: insets.top + Spacing.three, paddingBottom: insets.bottom + Spacing.five },
      ]}
      keyboardShouldPersistTaps="handled">
      <View style={styles.inner}>
        <ScreenHeader title={isNew ? 'Novo serviço' : 'Editar serviço'} />

        {errors.form ? (
          <Card style={styles.errorCard}>
            <AppText variant="support" color="textAccent">
              {errors.form}
            </AppText>
          </Card>
        ) : null}

        <TextField
          label="Nome"
          value={name}
          onChangeText={setName}
          placeholder="Alongamento em gel"
          editable={!saving}
          error={errors.name}
        />

        <TextField
          label="Preço"
          value={price}
          onChangeText={setPrice}
          placeholder="120,00"
          keyboardType="decimal-pad"
          inputMode="decimal"
          editable={!saving}
          error={errors.price}
        />
        {priceCents !== null && !errors.price ? (
          <AppText variant="support" color="textSecondary" style={styles.hint}>
            Fica {formatPrice(priceCents)}
          </AppText>
        ) : null}

        <AppText variant="label" color="textSecondary" style={styles.groupLabel}>
          PROMOÇÃO
        </AppText>

        <View style={styles.options}>
          {(
            [
              { value: 'nenhum', label: 'Sem promoção' },
              { value: 'valor', label: 'Abater um valor' },
              { value: 'percentual', label: 'Abater uma %' },
            ] as const
          ).map((option) => {
            const active = discountKind === option.value;

            return (
              <Pressable
                key={option.value}
                accessibilityRole="button"
                accessibilityState={{ selected: active }}
                onPress={() => setDiscountKind(option.value)}
                disabled={saving}
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

        {discountKind !== 'nenhum' ? (
          <TextField
            label={discountKind === 'valor' ? 'Quanto abater' : 'Quantos por cento'}
            value={discountValue}
            onChangeText={setDiscountValue}
            placeholder={discountKind === 'valor' ? '20,00' : '15'}
            keyboardType={discountKind === 'valor' ? 'decimal-pad' : 'number-pad'}
            inputMode={discountKind === 'valor' ? 'decimal' : 'numeric'}
            editable={!saving}
            error={errors.discount}
          />
        ) : null}

        {preview !== null && priceCents !== null && preview !== priceCents ? (
          <Card style={styles.example}>
            <AppText variant="support" color="textSecondary">
              A cliente vê{' '}
              <AppText variant="support" style={styles.struck}>
                {formatPrice(priceCents)}
              </AppText>{' '}
              por <AppText variant="label">{formatPrice(preview)}</AppText>. O preço cheio continua
              guardado — encerrando a promoção, ele volta sozinho.
            </AppText>
          </Card>
        ) : null}

        <TextField
          label="Duração em minutos"
          value={duration}
          onChangeText={setDuration}
          placeholder="150"
          keyboardType="number-pad"
          inputMode="numeric"
          editable={!saving}
          error={errors.duration}
        />
        {durationValid && !errors.duration ? (
          <AppText variant="support" color="textSecondary" style={styles.hint}>
            Fica {formatDuration(durationMinutes)}
          </AppText>
        ) : null}

        <TextField
          label="Arrumação depois, em minutos"
          value={buffer}
          onChangeText={setBuffer}
          placeholder="0"
          keyboardType="number-pad"
          inputMode="numeric"
          editable={!saving}
          error={errors.buffer}
        />
        <AppText variant="support" color="textSecondary" style={styles.hint}>
          Tempo de limpar e preparar para a próxima cliente. A agenda bloqueia, mas a cliente não
          vê — para ela o horário termina junto com o atendimento.
        </AppText>

        {durationValid && bufferValid && bufferMinutes > 0 ? (
          <Card style={styles.example}>
            <AppText variant="support" color="textSecondary">
              Marcando às 14:00, a cliente vê o término às{' '}
              <AppText variant="label">{addMinutes('14:00', durationMinutes)}</AppText> e o próximo
              horário livre é{' '}
              <AppText variant="label">
                {addMinutes('14:00', durationMinutes + bufferMinutes)}
              </AppText>
              .
            </AppText>
          </Card>
        ) : null}

        <View style={styles.footer}>
          <Button label={saving ? 'Salvando...' : 'Salvar'} onPress={handleSave} disabled={saving} />
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  content: { paddingHorizontal: Spacing.three },
  inner: { width: '100%', maxWidth: MaxContentWidth, alignSelf: 'center' },
  errorCard: { marginBottom: Spacing.three },
  hint: { marginTop: -Spacing.two, marginBottom: Spacing.three },
  example: { marginBottom: Spacing.three },
  groupLabel: { marginBottom: Spacing.two, letterSpacing: 1 },
  options: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two, marginBottom: Spacing.three },
  option: {
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    borderRadius: Radius.pill,
    borderWidth: 1,
  },
  struck: { textDecorationLine: 'line-through' },
  footer: { marginTop: Spacing.three },
});
