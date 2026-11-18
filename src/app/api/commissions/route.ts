import { NextResponse } from 'next/server';
import { appendAuditLog, mutateDb, uid } from '@/lib/server/store';
import { requireAuthorizedSession } from '@/lib/server/request-auth';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const action = body?.action as string;
    const tenantId = body?.tenantId as string;

    const auth = await requireAuthorizedSession({
      request,
      resource: 'commissions',
      action: action === 'pay_batch' || action === 'create_rule' || action === 'adjust' ? 'can_edit' : 'can_view',
      targetTenantId: tenantId,
    });
    if (!auth.ok) return auth.response;

    const effectiveTenantId =
      auth.session.roleCode === 'SUPER_ADMIN' ? tenantId : auth.session.tenant?.id;
    if (!effectiveTenantId) {
      return NextResponse.json({ error: 'Tenant não identificado.' }, { status: 400 });
    }

    if (action === 'create_rule') {
      const rule = await mutateDb((db) => {
        const created = {
          id: uid('rule'),
          tenant_id: effectiveTenantId,
          barber_id: body.barberId || null,
          service_id: body.serviceId || null,
          product_id: body.productId || null,
          rule_scope: body.ruleScope || 'barber_default',
          commission_type: body.commissionType === 'fixed' ? ('fixed' as const) : ('percentage' as const),
          value: Number(body.value || 0),
          goal_threshold: body.goalThreshold ? Number(body.goalThreshold) : null,
          bonus_amount: body.bonusAmount ? Number(body.bonusAmount) : null,
          is_active: true,
          created_at: new Date().toISOString(),
        };
        db.commission_rules.push(created);
        appendAuditLog(db, {
          tenant_id: effectiveTenantId,
          actor_profile_id: auth.session.profile.id,
          actor_role: auth.session.roleCode,
          action: 'COMMISSION_RULE_CREATED',
          entity: 'commission_rules',
          entity_id: created.id,
          severity: 'info',
          details: { scope: created.rule_scope, value: created.value },
        });
        return created;
      });
      return NextResponse.json({ ok: true, rule }, { status: 201 });
    }

    if (action === 'adjust') {
      const updated = await mutateDb((db) => {
        const comm = db.commissions.find(
          (c) => c.id === body.commissionId && c.tenant_id === effectiveTenantId
        );
        if (!comm) return null;
        const adj = Number(body.adjustmentAmount || 0);
        comm.adjustment_amount = adj;
        comm.adjustment_reason = String(body.adjustmentReason || 'Ajuste autorizado');
        comm.final_amount = Number((comm.commission_amount + adj).toFixed(2));
        return comm;
      });
      if (!updated) {
        return NextResponse.json({ error: 'Comissão não encontrada.' }, { status: 404 });
      }
      return NextResponse.json({ ok: true, commission: updated });
    }

    if (action === 'pay_batch') {
      const barberId = body.barberId as string | undefined;
      const result = await mutateDb((db) => {
        const nowIso = new Date().toISOString();
        const targets = db.commissions.filter(
          (c) =>
            c.tenant_id === effectiveTenantId &&
            c.status === 'pending' &&
            (!barberId || c.barber_id === barberId)
        );
        let totalPaid = 0;
        for (const item of targets) {
          item.status = 'paid';
          item.paid_at = nowIso;
          totalPaid += item.final_amount;
        }

        if (targets.length > 0) {
          const openReg = db.cash_registers.find(
            (r) => r.tenant_id === effectiveTenantId && r.status === 'open'
          );
          if (openReg) {
            db.cash_transactions.push({
              id: uid('ctx'),
              tenant_id: effectiveTenantId,
              branch_id: openReg.branch_id,
              cash_register_id: openReg.id,
              transaction_type: 'commission_payout',
              method: 'pix',
              amount: Number(totalPaid.toFixed(2)),
              description: `Fechamento de comissões (${targets.length} lançamento(s))`,
              created_by: auth.session.profile.id,
              created_at: nowIso,
            });
          }

          appendAuditLog(db, {
            tenant_id: effectiveTenantId,
            actor_profile_id: auth.session.profile.id,
            actor_role: auth.session.roleCode,
            action: 'COMMISSIONS_SETTLED',
            entity: 'commissions',
            severity: 'info',
            details: { count: targets.length, totalPaid, barberId },
          });
        }

        return { count: targets.length, totalPaid: Number(totalPaid.toFixed(2)) };
      });
      return NextResponse.json({ ok: true, ...result });
    }

    return NextResponse.json({ error: 'Ação de comissão não suportada.' }, { status: 400 });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Erro ao processar comissões.' },
      { status: 500 }
    );
  }
}
