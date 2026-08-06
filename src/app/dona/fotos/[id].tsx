/**
 * As fotos de um atendimento.
 *
 * Diferente da galeria em tudo que importa: aqui a unha é de uma cliente que
 * não escolheu aparecer em vitrine nenhuma. O depósito é privado e o endereço
 * de cada foto é temporário — por isso a lista é buscada toda vez que a tela
 * abre, e não guardada.
 */

import { Image } from 'expo-image';
import { useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppText } from '@/components/app-text';
import { Button } from '@/components/button';
import { CaptionField } from '@/components/caption-field';
import { Card } from '@/components/card';
import { ScreenHeader } from '@/components/screen-header';
import { MaxContentWidth, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { getAppointment, type AgendaItem } from '@/lib/agenda';
import { pickFromLibrary, takePhoto } from '@/lib/pick-image';
import {
  addAppointmentPhoto,
  listAppointmentPhotos,
  removeAppointmentPhoto,
  updateAppointmentPhotoNote,
  type AppointmentPhoto,
} from '@/lib/photos';

export default function AppointmentPhotosScreen() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();

  const [appointment, setAppointment] = useState<AgendaItem | null>(null);
  const [photos, setPhotos] = useState<AppointmentPhoto[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    try {
      const [found, list] = await Promise.all([getAppointment(id), listAppointmentPhotos(id)]);
      setAppointment(found);
      setPhotos(list);
    } catch (cause) {
      setError((cause as Error).message);
      setPhotos([]);
    }
  }, [id]);

  useFocusEffect(
    useCallback(() => {
      reload();
    }, [reload]),
  );

  async function add(source: 'camera' | 'galeria') {
    setError(null);

    try {
      const picked = source === 'camera' ? await takePhoto() : await pickFromLibrary();
      if (!picked) return;

      setBusy(true);
      // Sem observação: fotografar é o que tem hora para acontecer. Escrever
      // vem depois, no campo da própria foto, se ela quiser.
      await addAppointmentPhoto(id, picked.base64, null);
      await reload();
    } catch (cause) {
      setError((cause as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function remove(photo: AppointmentPhoto) {
    setBusy(true);
    setError(null);

    try {
      await removeAppointmentPhoto(photo.id, photo.path);
      await reload();
    } catch (cause) {
      setError((cause as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function saveNote(photo: AppointmentPhoto, note: string | null) {
    setError(null);

    try {
      await updateAppointmentPhotoNote(photo.id, note);
      await reload();
    } catch (cause) {
      setError((cause as Error).message);
    }
  }

  const when = appointment ? new Date(appointment.starts_at) : null;
  const subtitle = when
    ? `${when.toLocaleDateString('pt-BR')} · ${appointment!.services.join(' + ') || 'Sem serviço registrado'}`
    : undefined;

  return (
    <ScrollView
      style={{ backgroundColor: colors.background }}
      contentContainerStyle={[
        styles.content,
        { paddingTop: insets.top + Spacing.three, paddingBottom: insets.bottom + Spacing.five },
      ]}
      keyboardShouldPersistTaps="handled">
      <View style={styles.inner}>
        <ScreenHeader title={appointment?.client_name ?? 'Fotos'} subtitle={subtitle} />

        {error ? (
          <Card style={styles.errorCard}>
            <AppText variant="support" color="textAccent">
              {error}
            </AppText>
          </Card>
        ) : null}

        <View style={styles.addRow}>
          {/* A câmera não existe no navegador; oferecer o botão lá seria
              prometer o que não abre. */}
          {Platform.OS !== 'web' ? (
            <View style={styles.grow}>
              <Button
                label="Tirar foto"
                variant="secondary"
                onPress={() => add('camera')}
                disabled={busy}
              />
            </View>
          ) : null}
          <View style={styles.grow}>
            <Button label="Escolher foto" onPress={() => add('galeria')} disabled={busy} />
          </View>
        </View>

        {busy ? <ActivityIndicator color={colors.primary} style={styles.loader} /> : null}

        {photos === null ? (
          <ActivityIndicator color={colors.primary} style={styles.loader} />
        ) : photos.length === 0 ? (
          <Card>
            <AppText variant="body" color="textSecondary">
              Nenhuma foto deste atendimento ainda. O que você colocar aqui fica no histórico da
              cliente e só você vê — não vai para a vitrine.
            </AppText>
          </Card>
        ) : (
          photos.map((photo) => (
            <Card key={photo.id} style={styles.photoCard}>
              <Image
                source={{ uri: photo.url }}
                style={styles.photo}
                contentFit="cover"
                transition={200}
                accessibilityLabel={photo.note ?? 'Foto do atendimento'}
              />

              <CaptionField
                label="Observação"
                placeholder="O que foi feito, cor, o que reparar da próxima vez"
                value={photo.note}
                disabled={busy}
                onSave={(note) => saveNote(photo, note)}
              />

              <View style={styles.photoActions}>
                <AppText variant="support" color="textSecondary" style={styles.grow}>
                  {new Date(photo.created_at).toLocaleDateString('pt-BR')}
                </AppText>

                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Remover foto"
                  disabled={busy}
                  onPress={() => remove(photo)}
                  style={[styles.iconAction, { borderColor: colors.border, borderWidth: 1 }]}>
                  <AppText variant="label" color="textSecondary">
                    Remover
                  </AppText>
                </Pressable>
              </View>
            </Card>
          ))
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: Spacing.three },
  inner: { width: '100%', maxWidth: MaxContentWidth, alignSelf: 'center' },
  errorCard: { marginBottom: Spacing.three },
  addRow: { flexDirection: 'row', gap: Spacing.two, marginBottom: Spacing.four },
  grow: { flex: 1 },
  loader: { marginVertical: Spacing.three },
  photoCard: { marginBottom: Spacing.three, padding: Spacing.two },
  photo: {
    width: '100%',
    aspectRatio: 1,
    borderRadius: Radius.medium,
    marginBottom: Spacing.two,
  },
  photoActions: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  iconAction: {
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    borderRadius: Radius.pill,
  },
});
