/**
 * Mensagens de WhatsApp.
 *
 * O app monta o texto e abre a conversa; quem aperta enviar é a dona (DT-006).
 * Envio automático exigiria a API oficial do WhatsApp Business, que é paga por
 * conversa e tem cadastro burocrático — peso alto para um salão de uma pessoa.
 */

// Sem imports de propósito, para o texto e o número poderem ser conferidos
// fora do app. Por isso o preço chega pronto, em vez de em centavos: formatar
// dinheiro é assunto de quem chama. Abrir a conversa também é uma linha lá.

/**
 * Telefone no formato que o WhatsApp espera: só dígitos, com código do país.
 *
 * O banco guarda "11988887777". Sem o 55 na frente, o link abre uma conversa
 * com um número que não existe.
 */
export function toWhatsAppNumber(phone: string): string {
  const digits = phone.replace(/\D/g, '');

  // "5511988887777" já tem o país; "11988887777" não. Distinguir pelo tamanho
  // e não só pelo prefixo: um celular de São Paulo começa com 55 sem que 55
  // seja o país — "(55) 98888-7777" é do Rio Grande do Sul.
  if (digits.length >= 12 && digits.startsWith('55')) return digits;

  return `55${digits}`;
}

/** Primeiro nome — "Oi, Maria" soa melhor que "Oi, Maria Aparecida da Silva". */
function firstName(name: string): string {
  return name.trim().split(/\s+/)[0];
}

function dayAndTime(startsAt: string): { day: string; time: string } {
  const date = new Date(startsAt);

  return {
    day: date.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: '2-digit' }),
    time: date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
  };
}

export type MessageKind = 'confirmacao' | 'lembrete' | 'retorno';

type Appointment = {
  client_name: string;
  starts_at: string;
  services: string[];
  /** Já formatado, tipo "R$ 160,00". */
  price: string;
};

export function buildMessage(kind: MessageKind, appointment: Appointment): string {
  const { day, time } = dayAndTime(appointment.starts_at);
  const who = firstName(appointment.client_name);
  const what = appointment.services.join(' + ');

  if (kind === 'confirmacao') {
    return (
      `Oi, ${who}! Seu horário está confirmado 💅\n\n` +
      `${what}\n${day}, às ${time}\n${appointment.price}\n\n` +
      `Qualquer coisa é só me chamar por aqui. Até lá!`
    );
  }

  return (
    `Oi, ${who}! Passando pra lembrar do seu horário amanhã 💅\n\n` +
    `${what}\nÀs ${time}\n\n` +
    `Se precisar remarcar, me avisa que a gente ajeita.`
  );
}

export function buildReturnMessage(name: string, daysSince: number): string {
  return (
    `Oi, ${firstName(name)}! Tudo bem?\n\n` +
    `Faz ${daysSince} dias desde o seu último atendimento — já deve estar na hora de` +
    ` uma manutenção 💅\n\n` +
    `Me chama que a gente marca um horário!`
  );
}

/**
 * O endereço da conversa com o texto pronto.
 *
 * No celular abre o aplicativo; no navegador, o WhatsApp Web. O link wa.me
 * resolve os dois sem o app precisar saber onde está rodando.
 */
export function whatsAppUrl(phone: string, message: string): string {
  return `https://wa.me/${toWhatsAppNumber(phone)}?text=${encodeURIComponent(message)}`;
}
