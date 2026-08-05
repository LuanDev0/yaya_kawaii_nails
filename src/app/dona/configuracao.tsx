/** Configuração do salão. A agenda, que é a tela do dia a dia, fica em /dona. */

import { useRouter } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppText } from '@/components/app-text';
import { Button } from '@/components/button';
import { Card } from '@/components/card';
import { OwnerModeSwitch } from '@/components/owner-mode-switch';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { useAuth } from '@/hooks/use-auth';
import { useTheme } from '@/hooks/use-theme';

const LINKS = [
  { href: '/dona/clientes', title: 'Clientes', hint: 'Ficha, preferências e histórico' },
  { href: '/dona/retorno', title: 'Hora de voltar', hint: 'Quem sumiu e ainda não remarcou' },
  { href: '/dona/galeria', title: 'Galeria', hint: 'A vitrine que a cliente vê' },
  { href: '/dona/servicos', title: 'Serviços', hint: 'Nome, preço, duração e promoção' },
  { href: '/dona/horarios', title: 'Horários', hint: 'Padrão semanal de atendimento' },
  { href: '/dona/disponibilidade', title: 'Disponibilidade', hint: 'Folgas, férias e dias fora do padrão' },
  { href: '/dona/preferencias', title: 'Preferências', hint: 'Aprovação, cancelamento, retorno, tema' },
] as const;

export default function OwnerSettingsScreen() {
  const { colors } = useTheme();
  const { session, professional, signOut } = useAuth();
  const insets = useSafeAreaInsets();
  const router = useRouter();

  return (
    <ScrollView
      style={{ backgroundColor: colors.background }}
      contentContainerStyle={[
        styles.content,
        { paddingTop: insets.top + Spacing.four, paddingBottom: insets.bottom + Spacing.five },
      ]}>
      <View style={styles.inner}>
        <OwnerModeSwitch />

        <AppText variant="title">Configuração</AppText>

        <Card style={styles.card}>
          <AppText variant="label" color="textSecondary">
            CONECTADA COMO
          </AppText>
          <AppText variant="heading" style={styles.name}>
            {professional?.name}
          </AppText>
          <AppText variant="support" color="textSecondary">
            {session?.user.email}
          </AppText>
        </Card>

        <Card style={styles.card}>
          {LINKS.map((link, index) => (
            <Pressable
              key={link.href}
              accessibilityRole="button"
              onPress={() => router.push(link.href)}
              style={({ pressed }) => [
                styles.row,
                index > 0 && { borderTopWidth: 1, borderTopColor: colors.border },
                pressed && { opacity: 0.6 },
              ]}>
              <View style={styles.rowText}>
                <AppText variant="bodyBold">{link.title}</AppText>
                <AppText variant="support" color="textSecondary">
                  {link.hint}
                </AppText>
              </View>
              <AppText variant="bodyBold" color="textAccent">
                ›
              </AppText>
            </Pressable>
          ))}
        </Card>

        <View style={styles.footer}>
          <Button label="Sair" variant="secondary" onPress={signOut} />
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: Spacing.three },
  inner: { width: '100%', maxWidth: MaxContentWidth, alignSelf: 'center' },
  card: { marginTop: Spacing.four },
  name: { marginTop: Spacing.one },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing.three,
  },
  rowText: { flex: 1, paddingRight: Spacing.two },
  footer: { marginTop: Spacing.five },
});
