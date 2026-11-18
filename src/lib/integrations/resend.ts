export interface EmailDispatchResult {
  configured: boolean;
  status: 'sent' | 'failed' | 'integration_not_configured';
  providerMessageId?: string;
  error?: string;
  payload: Record<string, unknown>;
}

export function isResendConfigured(): boolean {
  return Boolean(process.env.RESEND_API_KEY);
}

export async function dispatchTransactionalEmail(params: {
  to: string;
  subject: string;
  html: string;
}): Promise<EmailDispatchResult> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM_EMAIL || 'Kortaz <onboarding@resend.dev>';

  if (!apiKey) {
    return {
      configured: false,
      status: 'integration_not_configured',
      error: 'RESEND_API_KEY não configurada. E-mail registrado na fila para envio futuro.',
      payload: { missingEnv: ['RESEND_API_KEY'] },
    };
  }

  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from,
        to: [params.to],
        subject: params.subject,
        html: params.html,
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      return {
        configured: true,
        status: 'failed',
        error: data?.message || 'Falha ao enviar via Resend.',
        payload: data,
      };
    }

    return {
      configured: true,
      status: 'sent',
      providerMessageId: data?.id,
      payload: data,
    };
  } catch (err) {
    return {
      configured: true,
      status: 'failed',
      error: err instanceof Error ? err.message : 'Erro de rede Resend.',
      payload: {},
    };
  }
}
