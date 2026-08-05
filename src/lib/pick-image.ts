/** Escolher uma foto da galeria do aparelho ou tirar na hora. */

import * as ImagePicker from 'expo-image-picker';

export type PickedImage = {
  base64: string;
  width: number;
  height: number;
};

/**
 * Reduz antes de enviar.
 *
 * Foto de celular hoje passa de 4 MB. Numa galeria de trinta trabalhos isso
 * vira mais de 100 MB para a cliente baixar no 4G dela — e a maior parte é
 * detalhe que ninguém enxerga numa tela de seis polegadas.
 */
const MAX_SIDE = 1400;
const QUALITY = 0.7;

async function fromResult(
  result: ImagePicker.ImagePickerResult,
): Promise<PickedImage | null> {
  if (result.canceled || !result.assets[0]?.base64) return null;

  const asset = result.assets[0];
  return { base64: asset.base64!, width: asset.width, height: asset.height };
}

/** Abre a galeria do aparelho. */
export async function pickFromLibrary(): Promise<PickedImage | null> {
  const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!permission.granted) throw new Error('Preciso da permissão para acessar suas fotos.');

  return fromResult(
    await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      base64: true,
      quality: QUALITY,
      allowsEditing: true,
    }),
  );
}

/** Abre a câmera. Não existe no navegador — a tela esconde o botão lá. */
export async function takePhoto(): Promise<PickedImage | null> {
  const permission = await ImagePicker.requestCameraPermissionsAsync();
  if (!permission.granted) throw new Error('Preciso da permissão para usar a câmera.');

  return fromResult(
    await ImagePicker.launchCameraAsync({
      mediaTypes: ['images'],
      base64: true,
      quality: QUALITY,
      allowsEditing: true,
    }),
  );
}

export { MAX_SIDE };
