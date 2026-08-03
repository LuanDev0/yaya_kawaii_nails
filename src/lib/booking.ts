/**
 * Agendamento.
 *
 * Nada aqui monta consulta: tudo passa pelas funções do banco, que são o
 * único caminho da cliente até a agenda. Ela nunca lê `appointments` nem
 * escreve nela — ver docs/BANCO-DE-DADOS.md.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

import { addDaysISO, todayISO, weekdayOf, type ISODate } from '@/lib/calendar';
import { supabase } from '@/lib/supabase';

export type AppointmentStatus = 'pendente' | 'confirmado' | 'cancelado' | 'concluido';

export type AppointmentDetails = {
  id: string;
  starts_at: string;
  ends_at: string;
  status: AppointmentStatus;
  services: string;
  price_cents: number;
};

/** Horários vagos para o conjunto de serviços escolhido, naquela data. */
export async function listAvailableSlots(
  serviceIds: string[],
  date: ISODate,
): Promise<string[]> {
  if (serviceIds.length === 0) return [];

  const { data, error } = await supabase.rpc('available_slots', {
    p_service_ids: serviceIds,
    p_date: date,
  });

  if (error) throw new Error(error.message);
  return ((data ?? []) as { slot: string }[]).map((row) => row.slot);
}

/** Duração e arrumação somadas — para a tela dizer quanto tempo vai levar. */
export async function servicesExtent(
  serviceIds: string[],
): Promise<{ duration_minutes: number; buffer_minutes: number }> {
  if (serviceIds.length === 0) return { duration_minutes: 0, buffer_minutes: 0 };

  const { data, error } = await supabase.rpc('services_extent', {
    p_service_ids: serviceIds,
  });

  if (error) throw new Error(error.message);

  const row = (data ?? [])[0] as { duration_minutes: number; buffer_minutes: number } | undefined;
  return row ?? { duration_minutes: 0, buffer_minutes: 0 };
}

export type PublicRules = {
  booking_window_days: number;
  minimum_notice_hours: number;
  allow_client_cancel: boolean;
};

/**
 * As regras que a cliente precisa conhecer para a tela não oferecer o que o
 * banco vai recusar. Só estas três colunas de `settings` são legíveis por ela.
 */
export async function getPublicRules(): Promise<PublicRules> {
  const { data, error } = await supabase
    .from('settings')
    .select('booking_window_days, minimum_notice_hours, allow_client_cancel')
    .maybeSingle();

  if (error) throw new Error(error.message);

  return (
    (data as PublicRules) ?? {
      booking_window_days: 14,
      minimum_notice_hours: 3,
      allow_client_cancel: true,
    }
  );
}

/**
 * Datas em que o salão abre, dentro da janela de agendamento.
 *
 * Usa só dado público — expediente e exceções — para a tela não oferecer uma
 * segunda-feira em que a dona nunca atende. Se há vaga naquele dia é outra
 * pergunta, feita ao tocar na data: essa depende da agenda, que é privada.
 */
export async function listOpenDates(windowDays: number): Promise<ISODate[]> {
  const [{ data: pros }, { data: hours }] = await Promise.all([
    supabase.from('professionals').select('id').limit(1),
    supabase.from('business_hours').select('weekday'),
  ]);

  const professionalId = (pros ?? [])[0]?.id as string | undefined;
  if (!professionalId) return [];

  const today = todayISO();
  const last = addDaysISO(today, windowDays);

  const { data: exceptions } = await supabase
    .from('schedule_exceptions')
    .select('date, opens_at')
    .gte('date', today)
    .lte('date', last);

  const weekdays = new Set((hours ?? []).map((h) => h.weekday as number));
  const byDate = new Map(
    (exceptions ?? []).map((e) => [e.date as ISODate, e.opens_at as string | null]),
  );

  const open: ISODate[] = [];

  for (let i = 0; i <= windowDays; i += 1) {
    const date = addDaysISO(today, i);
    const exception = byDate.get(date);

    // A exceção manda na data: com horário abre, sem horário fecha.
    if (exception !== undefined) {
      if (exception !== null) open.push(date);
      continue;
    }

    if (weekdays.has(weekdayOf(date))) open.push(date);
  }

  return open;
}

/** Cria o agendamento e devolve o código. */
export async function bookAppointment(
  serviceIds: string[],
  startsAt: string,
  name: string,
  phone: string,
): Promise<string> {
  const { data, error } = await supabase.rpc('book_appointment', {
    p_service_ids: serviceIds,
    p_starts_at: startsAt,
    p_name: name,
    p_phone: phone,
  });

  if (error) throw new Error(error.message);
  return data as string;
}

export async function getAppointment(id: string): Promise<AppointmentDetails | null> {
  const { data, error } = await supabase.rpc('appointment_details', { p_id: id });

  if (error) throw new Error(error.message);
  return ((data ?? [])[0] as AppointmentDetails) ?? null;
}

/**
 * Códigos dos agendamentos feitos neste aparelho.
 *
 * Como a cliente não tem senha (DT-004), o código é a prova de posse. Guardar
 * aqui é o que permite ela voltar depois e ver o horário dela — sem existir
 * uma busca por telefone, que deixaria qualquer pessoa ver o histórico alheio.
 */
const STORAGE_KEY = 'yaya:meus-agendamentos';

export async function rememberAppointment(id: string): Promise<void> {
  const saved = await listRememberedAppointments();
  if (saved.includes(id)) return;

  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify([id, ...saved]));
}

export async function listRememberedAppointments(): Promise<string[]> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];

    return Array.isArray(parsed) ? parsed.filter((x) => typeof x === 'string') : [];
  } catch {
    // Armazenamento corrompido ou indisponível não pode impedir de agendar.
    return [];
  }
}
