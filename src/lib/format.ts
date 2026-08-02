/** Formatação e leitura dos valores que aparecem na interface. */

/** 12000 vira "R$ 120,00". */
export function formatPrice(cents: number): string {
  return (cents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

/**
 * Lê o que a dona digitou no campo de preço e devolve centavos.
 *
 * Aceita "120", "120,00", "120.00" e "R$ 120,00" — ela não deveria precisar
 * adivinhar o formato certo. Devolve null se não der para entender.
 */
export function parsePrice(input: string): number | null {
  const cleaned = input.replace(/[^\d,.]/g, '').replace(/\.(?=\d{3}\b)/g, '');
  const normalized = cleaned.replace(',', '.');

  if (!normalized) return null;

  const value = Number(normalized);
  if (!Number.isFinite(value) || value < 0) return null;

  return Math.round(value * 100);
}

/** 150 vira "2h30"; 60 vira "1h"; 45 vira "45min". */
export function formatDuration(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;

  if (hours === 0) return `${rest}min`;
  if (rest === 0) return `${hours}h`;

  return `${hours}h${String(rest).padStart(2, '0')}`;
}

/** Nomes dos dias, na convenção do banco: 0 = domingo. */
export const WEEKDAYS = [
  'Domingo',
  'Segunda',
  'Terça',
  'Quarta',
  'Quinta',
  'Sexta',
  'Sábado',
] as const;

/** "09:00:00" do Postgres vira "09:00" para a tela. */
export function formatTime(value: string): string {
  return value.slice(0, 5);
}

/** "14:00" mais 150 minutos vira "16:30". Passa da meia-noite dando a volta. */
export function addMinutes(time: string, minutes: number): string {
  const [hours, mins] = time.split(':').map(Number);
  const total = (hours * 60 + mins + minutes) % (24 * 60);

  return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
}

/**
 * Valida e normaliza um horário digitado. Aceita "9:00" e devolve "09:00".
 * Devolve null se não for um horário válido.
 */
export function parseTime(input: string): string | null {
  const match = input.trim().match(/^(\d{1,2}):?(\d{2})$/);
  if (!match) return null;

  const hours = Number(match[1]);
  const minutes = Number(match[2]);

  if (hours > 23 || minutes > 59) return null;

  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
}
