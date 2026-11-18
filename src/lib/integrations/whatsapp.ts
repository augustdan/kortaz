export interface WhatsAppDispatchResult {
  configured: boolean;
  status: 'sent' | 'failed' | 'integration_not_configured';
  providerMessageId?: string;
  error?: string;
  payload: Record<string, unknown>;
}

export function isWhatsAppConfigured(): boolean {
  return Boolean(
    process.env.WHATSAPP_API_TOKEN && process.env.WHATSAPP_PHONE_NUMBER_ID
  );
}

export function renderNotificationTemplate(
  template: string,
  variables: Record<string, string>
): string {
  return template.replace(/\{(\w+)\}/g, (_, key: string) => variables[key] ?? `{${key}}`);
}

export function normalizeBrazilianPhone(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  if (digits.startsWith('55') && digits.length >= 12) return digits;
  if (digits.length >= 10) return `55${digits}`;
  return digits;
}

/**
 * Envia mensagem real via WhatsApp Business Cloud API quando configurado.
 * Nunca simula envio caso as credenciais não estejam presentes.
 */
export async function dispatchWhatsAppMessage(params: {
  toPhone: string;
  message: string;
}): Promise<WhatsAppDispatchResult> {
  const token = process.env.WHATSAPP_API_TOKEN;
  const phoneId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  const baseUrl = process.env.WHATSAPP_API_URL || 'https://graph.facebook.com/v21.0';

  if (!token || !phoneId) {
    return {
      configured: false,
      status: 'integration_not_configured',
      error:
        'WHATSAPP_API_TOKEN / WHATSAPP_PHONE_NUMBER_ID não configurados. Mensagem mantida na fila sem simulação.',
      payload: { missingEnv: ['WHATSAPP_API_TOKEN', 'WHATSAPP_PHONE_NUMBER_ID'] },
    };
  }

  const to = normalizeBrazilianPhone(params.toPhone);
  try {
    const res = await fetch(`${baseUrl}/${phoneId}/messages`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to,
        type: 'text',
        text: { preview_url: false, body: params.message },
      }),
    });

    const data = await res.json();
    if (!res.ok) {
      return {
        configured: true,
        status: 'failed',
        error: data?.error?.message || 'Erro retornado pela WhatsApp Cloud API.',
        payload: data,
      };
    }

    return {
      configured: true,
      status: 'sent',
      providerMessageId: data?.messages?.[0]?.id,
      payload: data,
    };
  } catch (err) {
    return {
      configured: true,
      status: 'failed',
      error: err instanceof Error ? err.message : 'Erro de conexão com WhatsApp API.',
      payload: {},
    };
  }
}
