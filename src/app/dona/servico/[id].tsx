/** Cadastro e edição de serviço. `id` vale "novo" para criar. */

import { useLocalSearchParams, useRouter } from 'expo-router';
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
import { formatDuration, formatPrice, parsePrice } from '@/lib/format';
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

  async function handleSave() {
    const found: Record<string, string> = {};

    if (!name.trim()) found.name = 'Dê um nome ao serviço.';
    if (priceCents === null) found.price = 'Preço inválido. Escreva algo como 120,00.';
    if (!durationValid) found.duration = 'Duração em minutos, um número maior que zero.';

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
          duration_minutes: durationMinutes,
          active: true,
          sort_order: nextOrder,
        });
      } else {
        await updateService(id, {
          name: name.trim(),
          price_cents: priceCents!,
          duration_minutes: durationMinutes,
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
  footer: { marginTop: Spacing.three },
});
