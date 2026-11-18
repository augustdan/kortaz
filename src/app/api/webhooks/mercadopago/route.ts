import { NextResponse } from 'next/server';
import {
  fetchMercadoPagoPaymentStatus,
  verifyMercadoPagoWebhookSignature,
} from '@/lib/integrations/mercadopago';
import {
  appendAuditLog,
  enqueueAndMaybeSendNotification,
  mutateDb,
  uid,
} from '@/lib/server/store';

/**
 * Webhook Oficial Mercado Pago.
 * 1. Valida assinatura criptográfica HMAC-SHA256 (`x-signature`).
 * 2. Consulta o status oficial do pagamento diretamente na API do Mercado Pago.
 * 3. Atualiza o pagamento somente após confirmação autenticada.
 */
export async function POST(request: Request) {
  try {
    const rawBody = await request.json();
    const dataId = String(rawBody?.data?.id || rawBody?.id || '');
    const xSignature = request.headers.get('x-signature');
    const xRequestId = request.headers.get('x-request-id');

    const sigCheck = verifyMercadoPagoWebhookSignature({
      xSignatureHeader: xSignature,
      xRequestIdHeader: xRequestId,
      dataId,
    });

    if (!sigCheck.valid) {
      await mutateDb((db) => {
        appendAuditLog(db, {
          tenant_id: null,
          action: 'MERCADOPAGO_WEBHOOK_REJECTED',
          entity: 'payments',
          entity_id: dataId,
          severity: 'warning',
          details: { reason: sigCheck.reason },
        });
      });
      return NextResponse.json(
        { error: 'Assinatura do webhook inválida.', reason: sigCheck.reason },
        { status: 401 }
      );
    }

    const remote = await fetchMercadoPagoPaymentStatus({ externalPaymentId: dataId });
    if (!remote.ok) {
      return NextResponse.json(
        { error: remote.error || 'Falha ao consultar transação no Mercado Pago.' },
        { status: 502 }
      );
    }

    const mpStatus = remote.status;
    const externalRef = String(remote.raw?.external_reference || '');

    const updated = await mutateDb(async (db) => {
      const payment = db.payments.find(
        (p) => p.external_payment_id === dataId || p.id === externalRef
      );
      if (!payment) return { found: false };

      const nowIso = new Date().toISOString();
      payment.external_payment_id = dataId;
      payment.webhook_verified_at = nowIso;
      payment.provider_fee = remote.fee ?? payment.provider_fee;

      if (mpStatus === 'approved' && payment.status !== 'approved') {
        payment.status = 'approved';
        payment.paid_at = nowIso;
        payment.net_amount = Number(
          (payment.gross_amount - payment.provider_fee - payment.refunded_amount).toFixed(2)
        );

        if (payment.appointment_id) {
          const appt = db.appointments.find((a) => a.id === payment.appointment_id);
          if (appt && appt.status === 'pending') {
            appt.status = 'confirmed';
          }
        }

        const openReg = db.cash_registers.find(
          (r) =>
            r.tenant_id === payment.tenant_id &&
            r.branch_id === payment.branch_id &&
            r.status === 'open'
        );
        if (openReg) {
          db.cash_transactions.push({
            id: uid('ctx'),
            tenant_id: payment.tenant_id,
            branch_id: payment.branch_id,
            cash_register_id: openReg.id,
            payment_id: payment.id,
            transaction_type: 'income',
            method: payment.method,
            amount: payment.net_amount,
            description: `Pagamento confirmado via Webhook Mercado Pago (#${dataId})`,
            created_at: nowIso,
          });
          openReg.expected_closing_balance = Number(
            (openReg.expected_closing_balance + payment.net_amount).toFixed(2)
          );
        }

        const customer = payment.customer_id
          ? db.customers.find((c) => c.id === payment.customer_id)
          : undefined;
        const tenant = db.tenants.find((t) => t.id === payment.tenant_id);
        if (customer && tenant) {
          await enqueueAndMaybeSendNotification(db, {
            tenantId: tenant.id,
            triggerEvent: 'payment_approved',
            customer,
            variables: {
              cliente: customer.full_name,
              servico: 'seu atendimento',
              barbearia: tenant.name,
            },
          });
        }
      } else if (mpStatus === 'rejected' || mpStatus === 'cancelled') {
        payment.status = 'failed';
      } else if (mpStatus === 'refunded') {
        payment.status = 'refunded';
      }

      appendAuditLog(db, {
        tenant_id: payment.tenant_id,
        action: 'MERCADOPAGO_WEBHOOK_PROCESSED',
        entity: 'payments',
        entity_id: payment.id,
        severity: 'info',
        details: { externalPaymentId: dataId, status: mpStatus },
      });

      return { found: true, paymentId: payment.id, status: payment.status };
    });

    return NextResponse.json({ ok: true, ...updated });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Erro no processamento do webhook.' },
      { status: 500 }
    );
  }
}
