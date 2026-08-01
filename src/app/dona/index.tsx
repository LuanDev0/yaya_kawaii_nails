/**
 * Painel da dona.
 *
 * Por enquanto confirma quem está logada e dá acesso à configuração. A agenda
 * entra na camada 3.
 */

import { useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppText } from '@/components/app-text';
import { Button } from '@/components/button';
import { Card } from '@/components/card';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { useAuth } from '@/hooks/use-auth';
import { useTheme } from '@/hooks/use-theme';
import { supabase } from '@/lib/supabase';

export default function OwnerHomeScreen() {
  const { colors } = useTheme();
  const { session, signOut } = useAuth();
  const insets = useSafeAreaInsets();

  const [name, setName] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    // Só retorna algo se a política "dona ve as profissionais" reconhecer a
    // conta. Serve de prova de que o vínculo está valendo no banco.
    supabase
      .from('professionals')
      .select('name')
      .eq('auth_user_id', session?.user.id ?? '')
      .maybeSingle()
      .then(({ data }) => {
        if (active) setName(data?.name ?? null);
      });

    return () => {
      active = false;
    };
  }, [session?.user.id]);

  return (
    <ScrollView
      style={{ backgroundColor: colors.background }}
      contentContainerStyle={[
        styles.content,
        { paddingTop: insets.top + Spacing.four, paddingBottom: insets.bottom + Spacing.five },
      ]}>
      <View style={styles.inner}>
        <AppText variant="title">Painel</AppText>

        <Card style={styles.card}>
          {name === null ? (
            <ActivityIndicator color={colors.primary} />
          ) : (
            <>
              <AppText variant="label" color="textSecondary">
                CONECTADA COMO
              </AppText>
              <AppText variant="heading" style={styles.name}>
                {name}
              </AppText>
              <AppText variant="support" color="textSecondary">
                {session?.user.email}
              </AppText>
            </>
          )}
        </Card>

        <AppText variant="body" color="textSecondary" style={styles.pending}>
          A agenda e as telas de configuração entram nos próximos passos.
        </AppText>

        <Button label="Sair" variant="secondary" onPress={signOut} />
      </View>
    </ScrollView>
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
  card: {
    marginTop: Spacing.four,
  },
  name: {
    marginTop: Spacing.one,
  },
  pending: {
    marginVertical: Spacing.four,
  },
});
