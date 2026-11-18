import { NextResponse } from 'next/server';
import { CreatePaymentCheckoutSchema, RefundPaymentSchema } from '@/lib/validations/schemas';
import {
  createMercadoPagoPixPayment,
  createMercadoPagoPreference,
  refundMercadoPagoPayment,
} from '@/lib/integrations/mercadopago';
import { appendAuditLog, mutateDb, readDb, uid } from '@/lib/server/store';
import { getRequestSession, requireAuthorizedSession } from '@/lib/server/request-auth';
import type { Payment } from '@/lib/types/domain';

export async function POST(request: Request) {
  try {
    const body = await request.json();

    // Estorno / Reembolso
    if (body?.action === 'refund') {
      const auth = await requireAuthorizedSession({
        request,
        resource: 'financial',
        action: 'can_edit',
        targetTenantId: body?.tenantId,
      });
      if (!auth.ok) return auth.response;

      const parsed = RefundPaymentSchema.safeParse(body);
      if (!parsed.success) {
        return NextResponse.json({ error: parsed.error.issues[0]?.message }, { status: 400 });
      }

      const dbSnap = await readDb();
      const targetPay = dbSnap.payments.find((p) => p.id === parsed.data.paymentId);
      if (!targetPay) {
        return NextResponse.json({ error: 'Pagamento não encontrado.' }, { status: 404 });
      }

      if (
        auth.session.roleCode !== 'SUPER_ADMIN' &&
        auth.session.tenant?.id !== targetPay.tenant_id
      ) {
        return NextResponse.json({ error: 'Isolamento multi-tenant violado.' }, { status: 403 });
      }

      let externalRefundId: string | null = null;
      if (targetPay.provider === 'mercadopago' && targetPay.external_payment_id) {
        const remote = await refundMercadoPagoPayment({
          externalPaymentId: targetPay.external_payment_id,
          amount: parsed.data.amount,
        });
        if (!remote.configured || !remote.ok) {
          return NextResponse.json(
            {
              error: remote.error,
              code: remote.configured ? 'PROVIDER_ERROR' : 'INTEGRATION_NOT_CONFIGURED',
            },
            { status: remote.configured ? 502 : 422 }
          );
        }
        externalRefundId = remote.externalRefundId ?? null;
      }

      const result = await mutateDb((db) => {
        const pay = db.payments.find((p) => p.id === parsed.data.paymentId)!;
        const maxRefundable = Number((pay.gross_amount - pay.refunded_amount).toFixed(2));
        if (parsed.data.amount > maxRefundable) {
          return {
            ok: false,
            error: `Valor excede o saldo estornável (máximo R$ ${maxRefundable.toFixed(2)}).`,
          };
        }

        const nowIso = new Date().toISOString();
        pay.refunded_amount = Number((pay.refunded_amount + parsed.data.amount).toFixed(2));
        pay.net_amount = Number(
          (pay.gross_amount - pay.provider_fee - pay.refunded_amount).toFixed(2)
        );
        pay.status =
          pay.refunded_amount >= pay.gross_amount ? 'refunded' : 'partially_refunded';

        const refund = {
          id: uid('ref'),
          tenant_id: pay.tenant_id,
          payment_id: pay.id,
          amount: parsed.data.amount,
          reason: parsed.data.reason,
          external_refund_id: externalRefundId,
          status: 'processed' as const,
          processed_by: auth.session.profile.id,
          created_at: nowIso,
        };
        db.refunds.push(refund);

        const openReg = db.cash_registers.find(
          (r) => r.tenant_id === pay.tenant_id && r.branch_id === pay.branch_id && r.status === 'open'
        );
        if (openReg) {
          db.cash_transactions.push({
            id: uid('ctx'),
            tenant_id: pay.tenant_id,
            branch_id: pay.branch_id,
            cash_register_id: openReg.id,
            payment_id: pay.id,
            transaction_type: 'refund',
            method: pay.method,
            amount: parsed.data.amount,
            description: `Estorno: ${parsed.data.reason}`,
            created_by: auth.session.profile.id,
            created_at: nowIso,
          });
          openReg.expected_closing_balance = Number(
            (openReg.expected_closing_balance - parsed.data.amount).toFixed(2)
          );
        }

        appendAuditLog(db, {
          tenant_id: pay.tenant_id,
          actor_profile_id: auth.session.profile.id,
          actor_role: auth.session.roleCode,
          action: 'PAYMENT_REFUNDED',
          entity: 'payments',
          entity_id: pay.id,
          severity: 'warning',
          details: { amount: parsed.data.amount, reason: parsed.data.reason },
        });

        return { ok: true, payment: pay, refund };
      });

      if (!result.ok) {
        return NextResponse.json({ error: result.error }, { status: 400 });
      }
      return NextResponse.json(result);
    }

    // Criação de checkout / cobrança
    const parsed = CreatePaymentCheckoutSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message }, { status: 400 });
    }

    const session = await getRequestSession(request);
    const dbSnap = await readDb();
    const appt = dbSnap.appointments.find(
      (a) => a.id === parsed.data.appointmentId && a.tenant_id === parsed.data.tenantId
    );
    if (!appt) {
      return NextResponse.json({ error: 'Agendamento não encontrado.' }, { status: 404 });
    }

    const customer = dbSnap.customers.find((c) => c.id === appt.customer_id);
    const tenant = dbSnap.tenants.find((t) => t.id === appt.tenant_id)!;
    const isManualCashier =
      body?.mode === 'manual_cashier' &&
      (parsed.data.method === 'cash' ||
        parsed.data.method === 'debit_card' ||
        parsed.data.method === 'credit_card' ||
        parsed.data.method === 'pix' ||
        parsed.data.method === 'partial' ||
        parsed.data.method === 'combined');

    if (isManualCashier) {
      const auth = await requireAuthorizedSession({
        request,
        resource: 'financial',
        action: 'can_create',
        targetTenantId: parsed.data.tenantId,
      });
      if (!auth.ok) return auth.response;

      const recorded = await mutateDb((db) => {
        const nowIso = new Date().toISOString();
        const payment: Payment = {
          id: uid('pay'),
          tenant_id: appt.tenant_id,
          branch_id: appt.branch_id,
          appointment_id: appt.id,
          customer_id: appt.customer_id,
          provider: 'manual',
          method: parsed.data.method,
          payment_type: parsed.data.paymentType,
          gross_amount: parsed.data.amount,
          provider_fee: 0,
          refunded_amount: 0,
          net_amount: parsed.data.amount,
          status: 'approved',
          paid_at: nowIso,
          created_at: nowIso,
        };
        db.payments.push(payment);

        const openReg = db.cash_registers.find(
          (r) => r.tenant_id === appt.tenant_id && r.branch_id === appt.branch_id && r.status === 'open'
        );
        if (openReg) {
          db.cash_transactions.push({
            id: uid('ctx'),
            tenant_id: appt.tenant_id,
            branch_id: appt.branch_id,
            cash_register_id: openReg.id,
            payment_id: payment.id,
            transaction_type: 'income',
            method: payment.method,
            amount: payment.gross_amount,
            description: `Recebimento presencial — ${customer?.full_name || 'Cliente'}`,
            created_by: auth.session.profile.id,
            created_at: nowIso,
          });
          openReg.expected_closing_balance = Number(
            (openReg.expected_closing_balance + payment.gross_amount).toFixed(2)
          );
        }

        return payment;
      });

      return NextResponse.json({ ok: true, payment: recorded }, { status: 201 });
    }

    // Fluxo Online Oficial via Mercado Pago (Pix ou Link/Checkout) — jamais aprova sem webhook!
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const paymentId = uid('pay');
    const payerEmail =
      parsed.data.payerEmail || customer?.email || 'cliente@barberos.com.br';

    if (parsed.data.method === 'pix' || parsed.data.method === 'deposit') {
      const mp = await createMercadoPagoPixPayment({
        amount: parsed.data.amount,
        description: `${tenant.name} — Agendamento #${appt.id.slice(-6)}`,
        payerEmail,
        externalReference: paymentId,
        notificationUrl: `${appUrl}/api/webhooks/mercadopago`,
      });

      if (!mp.configured) {
        await mutateDb((db) => {
          db.payments.push({
            id: paymentId,
            tenant_id: appt.tenant_id,
            branch_id: appt.branch_id,
            appointment_id: appt.id,
            customer_id: appt.customer_id,
            provider: 'mercadopago',
            method: parsed.data.method,
            payment_type: parsed.data.paymentType,
            gross_amount: parsed.data.amount,
            provider_fee: 0,
            refunded_amount: 0,
            net_amount: parsed.data.amount,
            status: 'pending',
            created_at: new Date().toISOString(),
          });
        });

        return NextResponse.json(
          {
            ok: false,
            code: mp.code,
            error: mp.error,
            missingEnv: mp.missingEnv,
            paymentId,
            status: 'pending',
          },
          { status: 422 }
        );
      }

      if (mp.code !== 'OK') {
        return NextResponse.json({ ok: false, error: mp.error }, { status: 502 });
      }

      const createdPayment = await mutateDb((db) => {
        const payment: Payment = {
          id: paymentId,
          tenant_id: appt.tenant_id,
          branch_id: appt.branch_id,
          appointment_id: appt.id,
          customer_id: appt.customer_id,
          provider: 'mercadopago',
          external_payment_id: mp.externalPaymentId,
          method: parsed.data.method,
          payment_type: parsed.data.paymentType,
          gross_amount: parsed.data.amount,
          provider_fee: 0,
          refunded_amount: 0,
          net_amount: parsed.data.amount,
          status: 'pending', // Aguarda webhook oficial para tornar-se 'approved'
          pix_qr_code: mp.pixQrCode,
          checkout_url: mp.ticketUrl,
          created_at: new Date().toISOString(),
        };
        db.payments.push(payment);
        return payment;
      });

      return NextResponse.json({
        ok: true,
        payment: createdPayment,
        pixQrCode: mp.pixQrCode,
        pixQrCodeBase64: mp.pixQrCodeBase64,
        ticketUrl: mp.ticketUrl,
        actorId: session?.profile.id ?? null,
      });
    }

    const pref = await createMercadoPagoPreference({
      title: `${tenant.name} — Agendamento #${appt.id.slice(-6)}`,
      amount: parsed.data.amount,
      externalReference: paymentId,
      successUrl: `${appUrl}/s/${tenant.slug}?payment=pending_confirmation`,
      failureUrl: `${appUrl}/s/${tenant.slug}?payment=failed`,
      pendingUrl: `${appUrl}/s/${tenant.slug}?payment=pending`,
      notificationUrl: `${appUrl}/api/webhooks/mercadopago`,
      payerEmail,
    });

    if (!pref.configured) {
      return NextResponse.json(
        {
          ok: false,
          code: pref.code,
          error: pref.error,
          missingEnv: pref.missingEnv,
        },
        { status: 422 }
      );
    }

    if (pref.code !== 'OK') {
      return NextResponse.json({ ok: false, error: pref.error }, { status: 502 });
    }

    const createdPayment = await mutateDb((db) => {
      const payment: Payment = {
        id: paymentId,
        tenant_id: appt.tenant_id,
        branch_id: appt.branch_id,
        appointment_id: appt.id,
        customer_id: appt.customer_id,
        provider: 'mercadopago',
        external_preference_id: pref.preferenceId,
        method: parsed.data.method,
        payment_type: parsed.data.paymentType,
        gross_amount: parsed.data.amount,
        provider_fee: 0,
        refunded_amount: 0,
        net_amount: parsed.data.amount,
        status: 'pending',
        checkout_url: pref.checkoutUrl,
        created_at: new Date().toISOString(),
      };
      db.payments.push(payment);
      return payment;
    });

    return NextResponse.json({
      ok: true,
      payment: createdPayment,
      checkoutUrl: pref.checkoutUrl,
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Erro ao processar pagamento.' },
      { status: 500 }
    );
  }
}
