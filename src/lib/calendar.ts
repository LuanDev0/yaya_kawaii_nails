/**
 * Datas do calendário, sempre como texto "AAAA-MM-DD".
 *
 * Nada de objeto Date circulando: um Date é um instante no tempo, e converter
 * instante para dia depende de fuso. "2026-08-10T00:00Z" vira dia 9 no Brasil,
 * e o bug aparece só para quem agenda perto da meia-noite — justamente o mais
 * difícil de reproduzir. Texto de data não tem esse problema.
 */

export type ISODate = string;

export function toISODate(year: number, month: number, day: number): ISODate {
  return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

/** Hoje no fuso do aparelho, que é o que a dona e a cliente enxergam. */
export function todayISO(): ISODate {
  const now = new Date();
  return toISODate(now.getFullYear(), now.getMonth(), now.getDate());
}

export function addDaysISO(date: ISODate, days: number): ISODate {
  const [year, month, day] = date.split('-').map(Number);
  const shifted = new Date(year, month - 1, day + days);

  return toISODate(shifted.getFullYear(), shifted.getMonth(), shifted.getDate());
}

/** 0 = domingo, igual à convenção usada em `business_hours`. */
export function weekdayOf(date: ISODate): number {
  const [year, month, day] = date.split('-').map(Number);
  return new Date(year, month - 1, day).getDay();
}

export function formatISODate(date: ISODate): string {
  const [year, month, day] = date.split('-');
  return `${day}/${month}/${year}`;
}

export const MONTH_NAMES = [
  'janeiro',
  'fevereiro',
  'março',
  'abril',
  'maio',
  'junho',
  'julho',
  'agosto',
  'setembro',
  'outubro',
  'novembro',
  'dezembro',
] as const;

/**
 * Semanas do mês, começando no domingo. Posições vazias viram null para a
 * grade manter o alinhamento das colunas.
 */
export function monthWeeks(year: number, month: number): (ISODate | null)[][] {
  const firstWeekday = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const cells: (ISODate | null)[] = Array(firstWeekday).fill(null);

  for (let day = 1; day <= daysInMonth; day += 1) {
    cells.push(toISODate(year, month, day));
  }

  while (cells.length % 7 !== 0) cells.push(null);

  const weeks: (ISODate | null)[][] = [];
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));

  return weeks;
}
