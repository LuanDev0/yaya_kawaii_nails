/**
 * Tela de demonstração da identidade visual.
 *
 * Existe para validar cores, fontes e componentes no aparelho de verdade, e
 * para provar que o app conversa com o banco. Sai quando a camada 2 entrar.
 */

import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppText } from '@/components/app-text';
import { Button } from '@/components/button';
import { Card } from '@/components/card';
import { MaxContentWidth, Radius, Spacing, type ThemeColor } from '@/constants/theme';
import { useTheme, type ThemeMode } from '@/hooks/use-theme';
import { formatDuration, formatPrice } from '@/lib/format';
import { listActiveServices, type Service } from '@/lib/services';

const MODES: { value: ThemeMode; label: string }[] = [
  { value: 'system', label: 'Sistema' },
  { value: 'light', label: 'Claro' },
  { value: 'dark', label: 'Escuro' },
];

const SWATCHES: ThemeColor[] = [
  'primary',
  'primaryPressed',
  'secondary',
  'blush',
  'peach',
  'surface',
];

export default function ThemePreviewScreen() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <ScrollView
      style={{ backgroundColor: colors.background }}
      contentContainerStyle={[
        styles.content,
        { paddingTop: insets.top + Spacing.four, paddingBottom: insets.bottom + Spacing.five },
      ]}>
      <View style={styles.inner}>
        <AppText variant="title">Yaya Kawaii Nails</AppText>
        <AppText variant="support" color="textSecondary" style={styles.tagline}>
          Prévia da identidade visual — camada 1
        </AppText>

        <ModeSwitcher />

        <Section title="Tipografia">
          <AppText variant="heading">Título em Baloo 2</AppText>
          <AppText variant="subheading" color="textSecondary">
            Subtítulo em Baloo 2
          </AppText>
          <AppText variant="body" style={styles.spaced}>
            Corpo em Nunito. Quer ter unhas lindas, resistentes e bem cuidadas? Um bom alongamento
            começa com uma aplicação correta e cuidados personalizados.
          </AppText>
          <AppText variant="support" color="textSecondary">
            Texto de apoio, usado em datas e legendas.
          </AppText>
        </Section>

        <Section title="Botões">
          <Button label="Agendar horário" onPress={() => {}} />
          <View style={styles.gap} />
          <Button label="Cancelar" variant="secondary" onPress={() => {}} />
        </Section>

        <Section title="Cores">
          <View style={styles.swatchGrid}>
            {SWATCHES.map((token) => (
              <View key={token} style={styles.swatchItem}>
                <View
                  style={[
                    styles.swatch,
                    { backgroundColor: colors[token], borderColor: colors.border },
                  ]}
                />
                <AppText variant="label" color="textSecondary">
                  {token}
                </AppText>
              </View>
            ))}
          </View>
        </Section>

        <Section title="Serviços vindos do banco">
          <ServiceList />
        </Section>
      </View>
    </ScrollView>
  );
}

/**
 * Busca os serviços no Supabase. Além de mostrar o visual com dados reais,
 * é a prova de que a conexão e as regras de acesso funcionam de ponta a ponta.
 */
function ServiceList() {
  const { colors } = useTheme();
  const [services, setServices] = useState<Service[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    listActiveServices()
      .then((list) => {
        if (active) setServices(list);
      })
      .catch((cause: Error) => {
        if (active) setError(cause.message);
      });

    // Evita atualizar estado depois que a tela saiu, o que gera aviso no console.
    return () => {
      active = false;
    };
  }, []);

  if (error) {
    return (
      <Card>
        <AppText variant="bodyBold">Não deu para carregar os serviços</AppText>
        <AppText variant="support" color="textSecondary" style={styles.spaced}>
          {error}
        </AppText>
      </Card>
    );
  }

  if (!services) {
    return (
      <Card>
        <ActivityIndicator color={colors.primary} />
      </Card>
    );
  }

  return (
    <Card>
      {services.map((service, index) => (
        <View
          key={service.id}
          style={[
            styles.serviceRow,
            index > 0 && { borderTopWidth: 1, borderTopColor: colors.border },
          ]}>
          <View style={styles.serviceInfo}>
            <AppText variant="bodyBold">{service.name}</AppText>
            <AppText variant="support" color="textSecondary">
              {formatDuration(service.duration_minutes)}
            </AppText>
          </View>
          <AppText variant="bodyBold" color="textAccent">
            {formatPrice(service.price_cents)}
          </AppText>
        </View>
      ))}
    </Card>
  );
}

function ModeSwitcher() {
  const { colors, mode, setMode } = useTheme();

  return (
    <View style={[styles.switcher, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      {MODES.map((option) => {
        const active = mode === option.value;

        return (
          <Pressable
            key={option.value}
            accessibilityRole="button"
            accessibilityState={{ selected: active }}
            onPress={() => setMode(option.value)}
            style={[
              styles.switcherOption,
              active && { backgroundColor: colors.secondary, borderRadius: Radius.pill },
            ]}>
            <AppText variant="label" color={active ? 'onPrimary' : 'textSecondary'}>
              {option.label}
            </AppText>
          </Pressable>
        );
      })}
    </View>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <AppText variant="label" color="textSecondary" style={styles.sectionTitle}>
        {title.toUpperCase()}
      </AppText>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: Spacing.three,
  },
  inner: {
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
  },
  tagline: {
    marginTop: Spacing.one,
  },
  section: {
    marginTop: Spacing.five,
  },
  sectionTitle: {
    marginBottom: Spacing.two,
    letterSpacing: 1,
  },
  spaced: {
    marginVertical: Spacing.two,
  },
  gap: {
    height: Spacing.two,
  },
  switcher: {
    flexDirection: 'row',
    marginTop: Spacing.four,
    padding: Spacing.one,
    borderWidth: 1,
    borderRadius: Radius.pill,
  },
  switcherOption: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: Spacing.two,
  },
  swatchGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  swatchItem: {
    width: 100,
  },
  swatch: {
    height: 56,
    borderRadius: Radius.small,
    borderWidth: 1,
    marginBottom: Spacing.one,
  },
  serviceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing.two,
  },
  serviceInfo: {
    flex: 1,
    paddingRight: Spacing.two,
  },
});
