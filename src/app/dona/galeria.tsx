/**
 * Galeria de trabalhos.
 *
 * É a vitrine que a cliente vê antes de escolher o serviço — em salão de unha,
 * é o que mais vende. Por isso a ordem importa: a primeira foto é o cartão de
 * visitas do salão.
 */

import { Image } from 'expo-image';
import { useFocusEffect } from 'expo-router';
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
import {
  addGalleryPhoto,
  listGalleryPhotos,
  removeGalleryPhoto,
  reorderGalleryPhotos,
  updateGalleryCaption,
  type GalleryPhoto,
} from '@/lib/photos';
import { pickFromLibrary, takePhoto } from '@/lib/pick-image';

export default function GalleryScreen() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();

  const [photos, setPhotos] = useState<GalleryPhoto[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    try {
      setPhotos(await listGalleryPhotos());
    } catch (cause) {
      setError((cause as Error).message);
    }
  }, []);

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
      await addGalleryPhoto(picked.base64, null);
      await reload();
    } catch (cause) {
      setError((cause as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function remove(photo: GalleryPhoto) {
    setBusy(true);
    setError(null);

    try {
      await removeGalleryPhoto(photo.id, photo.path);
      await reload();
    } catch (cause) {
      setError((cause as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function saveCaption(photo: GalleryPhoto, caption: string | null) {
    setError(null);

    try {
      await updateGalleryCaption(photo.id, caption);
      await reload();
    } catch (cause) {
      setError((cause as Error).message);
    }
  }

  async function move(index: number, direction: -1 | 1) {
    if (!photos) return;

    const target = index + direction;
    if (target < 0 || target >= photos.length) return;

    const reordered = [...photos];
    [reordered[index], reordered[target]] = [reordered[target], reordered[index]];

    const previous = photos;
    setPhotos(reordered);

    try {
      await reorderGalleryPhotos(reordered.map((p) => p.id));
    } catch (cause) {
      setPhotos(previous);
      setError((cause as Error).message);
    }
  }

  return (
    <ScrollView
      style={{ backgroundColor: colors.background }}
      contentContainerStyle={[
        styles.content,
        { paddingTop: insets.top + Spacing.three, paddingBottom: insets.bottom + Spacing.five },
      ]}>
      <View style={styles.inner}>
        <ScreenHeader
          title="Galeria"
          subtitle="O que a cliente vê antes de escolher. A primeira foto é o seu cartão de visitas."
        />

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
              Nenhuma foto ainda. As que você colocar aqui aparecem para a cliente na hora de
              escolher o serviço.
            </AppText>
          </Card>
        ) : (
          photos.map((photo, index) => (
            <Card key={photo.id} style={styles.photoCard}>
              <Image
                source={{ uri: photo.url }}
                style={styles.photo}
                contentFit="cover"
                transition={200}
                accessibilityLabel={photo.caption ?? 'Trabalho da Yaya'}
              />

              <CaptionField
                label="Legenda"
                placeholder="O que é este trabalho"
                value={photo.caption}
                disabled={busy}
                onSave={(caption) => saveCaption(photo, caption)}
              />

              <View style={styles.photoActions}>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Subir foto"
                  disabled={index === 0 || busy}
                  onPress={() => move(index, -1)}
                  style={[styles.iconAction, { opacity: index === 0 ? 0.25 : 1 }]}>
                  <AppText variant="label" color="textAccent">
                    ▲
                  </AppText>
                </Pressable>

                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Descer foto"
                  disabled={index === photos.length - 1 || busy}
                  onPress={() => move(index, 1)}
                  style={[
                    styles.iconAction,
                    { opacity: index === photos.length - 1 ? 0.25 : 1 },
                  ]}>
                  <AppText variant="label" color="textAccent">
                    ▼
                  </AppText>
                </Pressable>

                <View style={styles.grow} />

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
  photoActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    marginTop: Spacing.two,
  },
  iconAction: {
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    borderRadius: Radius.pill,
  },
});
