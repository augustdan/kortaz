import { NextResponse } from 'next/server';
import { appendAuditLog, mutateDb, readDb } from '@/lib/server/store';
import { getRequestSession } from '@/lib/server/request-auth';

/**
 * Portal LGPD — Exportação de dados pessoais, gerenciamento de consentimento/opt-out e exclusão/anonimização.
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const action = body?.action as 'export' | 'anonymize' | 'update_consent';
    const email = String(body?.email || '').trim().toLowerCase();
    const phone = String(body?.phone || '').replace(/\D/g, '');
    const session = await getRequestSession(request);

    if (!email && !phone && !session) {
      return NextResponse.json(
        { error: 'Informe seu e-mail ou telefone cadastrado para localizar seus dados LGPD.' },
        { status: 400 }
      );
    }

    const dbSnap = await readDb();
    const matchCustomer = (c: { email?: string; phone: string }) =>
      (email && c.email?.toLowerCase() === email) ||
      (phone && c.phone.replace(/\D/g, '') === phone) ||
      (session?.profile.email && c.email?.toLowerCase() === session.profile.email.toLowerCase());

    if (action === 'export') {
      const customers = dbSnap.customers.filter(matchCustomer);
      const customerIds = customers.map((c) => c.id);
      const appointments = dbSnap.appointments.filter((a) => customerIds.includes(a.customer_id));
      const payments = dbSnap.payments.filter(
        (p) => p.customer_id && customerIds.includes(p.customer_id)
      );
      const reviews = dbSnap.reviews.filter((r) => customerIds.includes(r.customer_id));

      return NextResponse.json({
        ok: true,
        exportedAt: new Date().toISOString(),
        titular: { email: email || session?.profile.email, phone },
        customers,
        appointments,
        payments,
        reviews,
      });
    }

    if (action === 'update_consent') {
      const updated = await mutateDb((db) => {
        const targets = db.customers.filter(matchCustomer);
        for (const cust of targets) {
          if (typeof body.whatsappOptIn === 'boolean') cust.whatsapp_opt_in = body.whatsappOptIn;
          if (typeof body.marketingOptIn === 'boolean') cust.marketing_opt_in = body.marketingOptIn;
        }
        return targets.length;
      });
      return NextResponse.json({ ok: true, updatedRecords: updated });
    }

    if (action === 'anonymize') {
      const anonymized = await mutateDb((db) => {
        const targets = db.customers.filter(matchCustomer);
        const nowIso = new Date().toISOString();
        for (const cust of targets) {
          cust.full_name = `Titular Anonimizado #${cust.id.slice(-4)}`;
          cust.email = undefined;
          cust.phone = '00000000000';
          cust.notes = 'Dados pessoais anonimizados mediante solicitação LGPD.';
          cust.marketing_opt_in = false;
          cust.whatsapp_opt_in = false;
          cust.anonymized_at = nowIso;

          appendAuditLog(db, {
            tenant_id: cust.tenant_id,
            actor_profile_id: session?.profile.id ?? null,
            action: 'LGPD_DATA_ANONYMIZED',
            entity: 'customers',
            entity_id: cust.id,
            severity: 'warning',
            details: { reason: 'Solicitação do titular' },
          });
        }
        return targets.length;
      });

      return NextResponse.json({
        ok: true,
        anonymizedRecords: anonymized,
        message:
          anonymized > 0
            ? 'Seus dados pessoais identificáveis foram anonimizados preservando apenas registros fiscais obrigatórios.'
            : 'Nenhum cadastro ativo localizado com os dados informados.',
      });
    }

    return NextResponse.json({ error: 'Ação LGPD não reconhecida.' }, { status: 400 });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Erro no portal LGPD.' },
      { status: 500 }
    );
  }
}
