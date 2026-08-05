import { Baloo2_600SemiBold, Baloo2_700Bold } from '@expo-google-fonts/baloo-2';
import { Nunito_400Regular, Nunito_700Bold } from '@expo-google-fonts/nunito';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { TextStyles } from '@/constants/theme';
import { AuthProvider } from '@/hooks/use-auth';
import { ThemeProvider, useTheme } from '@/hooks/use-theme';
import { isSupabaseConfigured } from '@/lib/supabase';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  // A splash fica na tela até as fontes carregarem. Sem isso o app abre com a
  // fonte do sistema e troca no meio, o que dá um salto visual feio.
  const [fontsLoaded, fontError] = useFonts({
    Baloo2_600SemiBold,
    Baloo2_700Bold,
    Nunito_400Regular,
    Nunito_700Bold,
  });

  useEffect(() => {
    if (fontsLoaded || fontError) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontError]);

  if (!fontsLoaded && !fontError) {
    return null;
  }

  return (
    <ThemeProvider>
      <AuthProvider>
        <RootStack />
      </AuthProvider>
    </ThemeProvider>
  );
}

/** Precisa ser um componente separado para poder ler o tema do provedor acima. */
function RootStack() {
  const { colors, scheme } = useTheme();

  // Sem configuração, nenhuma tela funciona — e fechar o app sem explicação é
  // pior que qualquer erro. Melhor abrir e dizer o que houve.
  if (!isSupabaseConfigured) {
    return (
      <>
        <StatusBar style={scheme === 'dark' ? 'light' : 'dark'} />
        <View style={[styles.centered, { backgroundColor: colors.background }]}>
          <View style={styles.message}>
            <Text style={[TextStyles.heading, { color: colors.textPrimary }]}>
              Configuração faltando
            </Text>
            <Text style={[TextStyles.body, styles.spaced, { color: colors.textSecondary }]}>
              Este aplicativo foi montado sem o endereço do banco de dados, então não consegue
              carregar nada.
            </Text>
            <Text style={[TextStyles.support, { color: colors.textSecondary }]}>
              Quem instalou precisa cadastrar EXPO_PUBLIC_SUPABASE_URL e
              EXPO_PUBLIC_SUPABASE_ANON_KEY e gerar o aplicativo de novo.
            </Text>
          </View>
        </View>
      </>
    );
  }

  return (
    <>
      <StatusBar style={scheme === 'dark' ? 'light' : 'dark'} />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: colors.background },
        }}
      />
    </>
  );
}

const styles = StyleSheet.create({
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  message: { maxWidth: 420, gap: 8 },
  spaced: { marginVertical: 8 },
});
