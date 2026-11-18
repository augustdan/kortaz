import crypto from 'node:crypto';

export interface MercadoPagoPixResult {
  configured: boolean;
  code: 'OK' | 'INTEGRATION_NOT_CONFIGURED' | 'PROVIDER_ERROR';
  externalPaymentId?: string;
  pixQrCode?: string;
  pixQrCodeBase64?: string;
  ticketUrl?: string;
  error?: string;
  missingEnv?: string[];
}

export interface MercadoPagoCheckoutResult {
  configured: boolean;
  code: 'OK' | 'INTEGRATION_NOT_CONFIGURED' | 'PROVIDER_ERROR';
  preferenceId?: string;
  checkoutUrl?: string;
  error?: string;
  missingEnv?: string[];
}

export function isMercadoPagoConfigured(): boolean {
  return Boolean(process.env.MERCADO_PAGO_ACCESS_TOKEN);
}

export async function createMercadoPagoPixPayment(params: {
  amount: number;
  description: string;
  payerEmail: string;
  externalReference: string;
  notificationUrl?: string;
  accessToken?: string;
}): Promise<MercadoPagoPixResult> {
  const token = params.accessToken || process.env.MERCADO_PAGO_ACCESS_TOKEN;
  if (!token) {
    return {
      configured: false,
      code: 'INTEGRATION_NOT_CONFIGURED',
      missingEnv: ['MERCADO_PAGO_ACCESS_TOKEN', 'MERCADO_PAGO_WEBHOOK_SECRET'],
      error:
        'Integração Mercado Pago não configurada neste ambiente. Defina MERCADO_PAGO_ACCESS_TOKEN para gerar Pix em tempo real.',
    };
  }

  try {
    const response = await fetch('https://api.mercadopago.com/v1/payments', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        'X-Idempotency-Key': `barberos-${params.externalReference}`,
      },
      body: JSON.stringify({
        transaction_amount: Number(params.amount.toFixed(2)),
        description: params.description,
        payment_method_id: 'pix',
        external_reference: params.externalReference,
        notification_url: params.notificationUrl,
        payer: {
          email: params.payerEmail,
        },
      }),
    });

    const data = await response.json();
    if (!response.ok) {
      return {
        configured: true,
        code: 'PROVIDER_ERROR',
        error: data?.message || 'Erro ao comunicar com API do Mercado Pago.',
      };
    }

    return {
      configured: true,
      code: 'OK',
      externalPaymentId: String(data.id),
      pixQrCode: data?.point_of_interaction?.transaction_data?.qr_code,
      pixQrCodeBase64: data?.point_of_interaction?.transaction_data?.qr_code_base64,
      ticketUrl: data?.point_of_interaction?.transaction_data?.ticket_url,
    };
  } catch (err) {
    return {
      configured: true,
      code: 'PROVIDER_ERROR',
      error: err instanceof Error ? err.message : 'Falha de rede com Mercado Pago.',
    };
  }
}

export async function createMercadoPagoPreference(params: {
  title: string;
  amount: number;
  externalReference: string;
  successUrl: string;
  failureUrl: string;
  pendingUrl: string;
  notificationUrl: string;
  payerEmail?: string;
  accessToken?: string;
}): Promise<MercadoPagoCheckoutResult> {
  const token = params.accessToken || process.env.MERCADO_PAGO_ACCESS_TOKEN;
  if (!token) {
    return {
      configured: false,
      code: 'INTEGRATION_NOT_CONFIGURED',
      missingEnv: ['MERCADO_PAGO_ACCESS_TOKEN'],
      error:
        'Checkout Mercado Pago aguarda configuração de MERCADO_PAGO_ACCESS_TOKEN.',
    };
  }

  try {
    const response = await fetch('https://api.mercadopago.com/checkout/preferences', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        items: [
          {
            title: params.title,
            quantity: 1,
            currency_id: 'BRL',
            unit_price: Number(params.amount.toFixed(2)),
          },
        ],
        payer: params.payerEmail ? { email: params.payerEmail } : undefined,
        external_reference: params.externalReference,
        notification_url: params.notificationUrl,
        back_urls: {
          success: params.successUrl,
          failure: params.failureUrl,
          pending: params.pendingUrl,
        },
        auto_return: 'approved',
      }),
    });

    const data = await response.json();
    if (!response.ok) {
      return {
        configured: true,
        code: 'PROVIDER_ERROR',
        error: data?.message || 'Erro ao gerar link de pagamento Mercado Pago.',
      };
    }

    return {
      configured: true,
      code: 'OK',
      preferenceId: String(data.id),
      checkoutUrl: data.init_point || data.sandbox_init_point,
    };
  } catch (err) {
    return {
      configured: true,
      code: 'PROVIDER_ERROR',
      error: err instanceof Error ? err.message : 'Falha de comunicação com Mercado Pago.',
    };
  }
}

export async function fetchMercadoPagoPaymentStatus(params: {
  externalPaymentId: string;
  accessToken?: string;
}): Promise<{ ok: boolean; status?: string; fee?: number; raw?: Record<string, unknown>; error?: string }> {
  const token = params.accessToken || process.env.MERCADO_PAGO_ACCESS_TOKEN;
  if (!token) {
    return { ok: false, error: 'MERCADO_PAGO_ACCESS_TOKEN não configurado.' };
  }

  try {
    const res = await fetch(`https://api.mercadopago.com/v1/payments/${params.externalPaymentId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await res.json();
    if (!res.ok) {
      return { ok: false, error: data?.message || 'Falha ao consultar pagamento no Mercado Pago.' };
    }
    const fees = Array.isArray(data.fee_details)
      ? data.fee_details.reduce((acc: number, f: { amount?: number }) => acc + Number(f.amount || 0), 0)
      : 0;

    return {
      ok: true,
      status: String(data.status || 'pending'),
      fee: fees,
      raw: data,
    };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Erro de rede' };
  }
}

export async function refundMercadoPagoPayment(params: {
  externalPaymentId: string;
  amount?: number;
  accessToken?: string;
}): Promise<{ configured: boolean; ok: boolean; externalRefundId?: string; error?: string }> {
  const token = params.accessToken || process.env.MERCADO_PAGO_ACCESS_TOKEN;
  if (!token) {
    return {
      configured: false,
      ok: false,
      error: 'MERCADO_PAGO_ACCESS_TOKEN não configurado para processar estorno remoto.',
    };
  }

  try {
    const res = await fetch(
      `https://api.mercadopago.com/v1/payments/${params.externalPaymentId}/refunds`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: params.amount ? JSON.stringify({ amount: Number(params.amount.toFixed(2)) }) : undefined,
      }
    );
    const data = await res.json();
    if (!res.ok) {
      return { configured: true, ok: false, error: data?.message || 'Estorno recusado pelo provedor.' };
    }
    return { configured: true, ok: true, externalRefundId: String(data.id) };
  } catch (err) {
    return {
      configured: true,
      ok: false,
      error: err instanceof Error ? err.message : 'Falha de comunicação.',
    };
  }
}

/**
 * Verifica a assinatura oficial `x-signature` do Webhook Mercado Pago:
 * manifest = `id:[data.id];request-id:[x-request-id];ts:[ts];`
 */
export function verifyMercadoPagoWebhookSignature(params: {
  xSignatureHeader: string | null;
  xRequestIdHeader: string | null;
  dataId: string;
  secret?: string;
}): { valid: boolean; reason?: string } {
  const secret = params.secret || process.env.MERCADO_PAGO_WEBHOOK_SECRET;
  if (!secret) {
    return {
      valid: false,
      reason: 'MERCADO_PAGO_WEBHOOK_SECRET não configurado no servidor.',
    };
  }

  if (!params.xSignatureHeader || !params.xRequestIdHeader || !params.dataId) {
    return { valid: false, reason: 'Cabeçalhos obrigatórios de assinatura ausentes.' };
  }

  const parts = Object.fromEntries(
    params.xSignatureHeader.split(',').map((item) => {
      const [k, v] = item.trim().split('=');
      return [k, v];
    })
  );

  const ts = parts.ts;
  const v1 = parts.v1;
  if (!ts || !v1) {
    return { valid: false, reason: 'Formato de x-signature inválido.' };
  }

  const manifest = `id:${params.dataId};request-id:${params.xRequestIdHeader};ts:${ts};`;
  const expected = crypto.createHmac('sha256', secret).update(manifest).digest('hex');

  const expectedBuf = Buffer.from(expected, 'utf8');
  const receivedBuf = Buffer.from(v1, 'utf8');
  if (expectedBuf.length !== receivedBuf.length) {
    return { valid: false, reason: 'Assinatura divergente.' };
  }

  const matches = crypto.timingSafeEqual(expectedBuf, receivedBuf);
  return matches ? { valid: true } : { valid: false, reason: 'Assinatura HMAC inválida.' };
}
