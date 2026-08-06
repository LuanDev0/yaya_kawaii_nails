/**
 * Fotos dos trabalhos.
 *
 * Dois depósitos, com naturezas diferentes:
 *
 *   galeria      — público. Vitrine, feita para ser vista.
 *   atendimentos — privado. A unha da cliente no histórico dela, que não
 *                  escolheu aparecer em vitrine nenhuma.
 *
 * O privado só abre por link temporário, gerado a pedido e com validade.
 */

import { supabase } from '@/lib/supabase';

export type GalleryPhoto = {
  id: string;
  path: string;
  caption: string | null;
  sort_order: number;
  /** Endereço pronto para exibir. */
  url: string;
};

export type AppointmentPhoto = {
  id: string;
  path: string;
  note: string | null;
  created_at: string;
  /** Link temporário — expira, por isso é buscado a cada abertura da tela. */
  url: string;
};

/** Uma hora basta: a tela é aberta, olhada e fechada. */
const SIGNED_URL_SECONDS = 3600;

/**
 * Converte o base64 que o seletor de imagens devolve em bytes.
 *
 * Feito à mão porque `atob` não existe em toda plataforma que o app roda, e o
 * caminho de mandar o arquivo direto (via fetch no endereço local) funciona no
 * navegador e falha no celular — justamente onde as fotos são tiradas.
 */
function base64ToBytes(base64: string): Uint8Array {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
  const clean = base64.replace(/[^A-Za-z0-9+/]/g, '');
  const bytes = new Uint8Array((clean.length * 3) / 4);

  let byte = 0;
  let buffer = 0;
  let bits = 0;

  for (const char of clean) {
    buffer = (buffer << 6) | alphabet.indexOf(char);
    bits += 6;

    if (bits >= 8) {
      bits -= 8;
      bytes[byte++] = (buffer >> bits) & 0xff;
    }
  }

  return bytes.subarray(0, byte);
}

function uniquePath(prefix: string): string {
  const stamp = new Date().toISOString().replace(/[-:.TZ]/g, '');
  const random = Math.random().toString(36).slice(2, 8);

  return `${prefix}/${stamp}-${random}.jpg`;
}

async function upload(bucket: string, path: string, base64: string): Promise<void> {
  const { error } = await supabase.storage
    .from(bucket)
    .upload(path, base64ToBytes(base64), { contentType: 'image/jpeg' });

  if (error) throw new Error(error.message);
}

// ---------------------------------------------------------------------------
// Galeria
// ---------------------------------------------------------------------------

export async function listGalleryPhotos(): Promise<GalleryPhoto[]> {
  const { data, error } = await supabase
    .from('gallery_photos')
    .select('id, path, caption, sort_order')
    .order('sort_order');

  if (error) throw new Error(error.message);

  return (data ?? []).map((row) => ({
    ...(row as Omit<GalleryPhoto, 'url'>),
    url: supabase.storage.from('galeria').getPublicUrl(row.path).data.publicUrl,
  }));
}

export async function addGalleryPhoto(base64: string, caption: string | null): Promise<void> {
  const path = uniquePath('trabalhos');
  await upload('galeria', path, base64);

  // Entra no fim; a ordem é ajustável depois.
  const { data: last } = await supabase
    .from('gallery_photos')
    .select('sort_order')
    .order('sort_order', { ascending: false })
    .limit(1);

  const nextOrder = ((last ?? [])[0]?.sort_order ?? -1) + 1;

  const { error } = await supabase
    .from('gallery_photos')
    .insert({ path, caption, sort_order: nextOrder });

  if (error) throw new Error(error.message);
}

export async function removeGalleryPhoto(id: string, path: string): Promise<void> {
  // O arquivo sai junto com o registro: foto órfã no depósito é conta que
  // cresce sem ninguém ver.
  await supabase.storage.from('galeria').remove([path]);

  const { error } = await supabase.from('gallery_photos').delete().eq('id', id);
  if (error) throw new Error(error.message);
}

export async function updateGalleryCaption(id: string, caption: string | null): Promise<void> {
  const { error } = await supabase.from('gallery_photos').update({ caption }).eq('id', id);
  if (error) throw new Error(error.message);
}

export async function reorderGalleryPhotos(orderedIds: string[]): Promise<void> {
  for (const [index, id] of orderedIds.entries()) {
    const { error } = await supabase
      .from('gallery_photos')
      .update({ sort_order: index })
      .eq('id', id);

    if (error) throw new Error(error.message);
  }
}

// ---------------------------------------------------------------------------
// Fotos de atendimento
// ---------------------------------------------------------------------------

export async function listAppointmentPhotos(appointmentId: string): Promise<AppointmentPhoto[]> {
  const { data, error } = await supabase
    .from('appointment_photos')
    .select('id, path, note, created_at')
    .eq('appointment_id', appointmentId)
    .order('created_at');

  if (error) throw new Error(error.message);

  const rows = (data ?? []) as Omit<AppointmentPhoto, 'url'>[];
  if (rows.length === 0) return [];

  const { data: signed } = await supabase.storage
    .from('atendimentos')
    .createSignedUrls(rows.map((row) => row.path), SIGNED_URL_SECONDS);

  const urlByPath = new Map((signed ?? []).map((item) => [item.path, item.signedUrl]));

  return rows.map((row) => ({ ...row, url: urlByPath.get(row.path) ?? '' }));
}

export async function addAppointmentPhoto(
  appointmentId: string,
  base64: string,
  note: string | null,
): Promise<void> {
  const path = uniquePath(appointmentId);
  await upload('atendimentos', path, base64);

  const { error } = await supabase
    .from('appointment_photos')
    .insert({ appointment_id: appointmentId, path, note });

  if (error) throw new Error(error.message);
}

export async function updateAppointmentPhotoNote(id: string, note: string | null): Promise<void> {
  const { error } = await supabase.from('appointment_photos').update({ note }).eq('id', id);
  if (error) throw new Error(error.message);
}

export async function removeAppointmentPhoto(id: string, path: string): Promise<void> {
  await supabase.storage.from('atendimentos').remove([path]);

  const { error } = await supabase.from('appointment_photos').delete().eq('id', id);
  if (error) throw new Error(error.message);
}
