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

/**
 * Lê uma data escrita como a dona escreve: "31/05/2026" vira "2026-05-31".
 * Devolve null se não der para entender.
 *
 * A interface fala o formato dela; o banco continua com o dele.
 */
export function parseBRDate(input: string): ISODate | null {
  const match = input.trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (!match) return null;

  const [, day, month, year] = match;
  const iso = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;

  // Recusa 31/02: a data existe no texto, mas não no calendário.
  const check = new Date(Number(year), Number(month) - 1, Number(day));
  if (check.getMonth() !== Number(month) - 1 || check.getDate() !== Number(day)) return null;

  return iso;
}

/** 0 = domingo, igual a `weekdayOf` e a `business_hours`. */
export function startOfWeekISO(date: ISODate): ISODate {
  return addDaysISO(date, -weekdayOf(date));
}

export function startOfMonthISO(date: ISODate): ISODate {
  const [year, month] = date.split('-');
  return `${year}-${month}-01`;
}

export function endOfMonthISO(date: ISODate): ISODate {
  const [year, month] = date.split('-').map(Number);

  // Dia 0 do mês seguinte é o último dia deste — e acerta fevereiro bissexto
  // sem ninguém precisar lembrar da regra.
  return toISODate(year, month - 1, new Date(year, month, 0).getDate());
}

/**
 * O recorte de tempo que o faturamento mostra.
 *
 * Mora aqui, e não junto das consultas, porque é conta de calendário: virada
 * de mês, virada de ano e semana que começa no domingo. Sem importar nada, dá
 * para conferir fora do app — que é o mesmo motivo de `pricing.ts`.
 */
export type Period = 'dia' | 'semana' | 'mes';

export type DateRange = { from: ISODate; to: ISODate };

export function periodRange(period: Period, today: ISODate): DateRange {
  if (period === 'dia') return { from: today, to: today };

  if (period === 'semana') {
    const from = startOfWeekISO(today);
    return { from, to: addDaysISO(from, 6) };
  }

  return { from: startOfMonthISO(today), to: endOfMonthISO(today) };
}

/**
 * O instante em que o dia começa para quem está olhando a tela.
 *
 * Esta é a borda que erra em silêncio. `starts_at` no banco é um instante, e o
 * dia da dona começa à meia-noite do fuso dela, não do servidor. Mandar o
 * texto "2026-08-06T00:00:00" faz o Postgres ler em UTC, e no Brasil isso joga
 * o atendimento das 21h para o dia seguinte — some de um dia e reaparece no
 * outro, e só quem atende à noite descobre.
 */
export function dayStartInstant(date: ISODate): string {
  const [year, month, day] = date.split('-').map(Number);
  return new Date(year, month - 1, day).toISOString();
}

/** Meia-noite do dia seguinte, para usar como fim exclusivo — sem 23:59:59. */
export function dayAfterInstant(date: ISODate): string {
  const [year, month, day] = date.split('-').map(Number);
  return new Date(year, month - 1, day + 1).toISOString();
}

/** O período anterior de mesmo tipo: ontem, a semana passada, o mês passado. */
export function previousPeriodRange(period: Period, today: ISODate): DateRange {
  if (period === 'dia') {
    const yesterday = addDaysISO(today, -1);
    return { from: yesterday, to: yesterday };
  }

  if (period === 'semana') {
    const from = addDaysISO(startOfWeekISO(today), -7);
    return { from, to: addDaysISO(from, 6) };
  }

  // Um dia antes do dia 1 cai no último dia do mês passado, seja ele 28 ou 31.
  const lastDay = addDaysISO(startOfMonthISO(today), -1);
  return { from: startOfMonthISO(lastDay), to: lastDay };
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
