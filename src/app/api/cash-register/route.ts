import { NextResponse } from 'next/server';
import { CashRegisterActionSchema } from '@/lib/validations/schemas';
import { appendAuditLog, mutateDb, uid } from '@/lib/server/store';
import { requireAuthorizedSession } from '@/lib/server/request-auth';

export async function POST(request: Request) {
  try {
    const body = await request.json();

    if (body?.action === 'pay_expense') {
      const auth = await requireAuthorizedSession({
        request,
        resource: 'financial',
        action: 'can_edit',
        targetTenantId: body?.tenantId,
      });
      if (!auth.ok) return auth.response;

      const updated = await mutateDb((db) => {
        const exp = db.expenses.find(
          (e) => e.id === body.expenseId && e.tenant_id === auth.session.tenant?.id
        );
        if (!exp) return null;
        exp.status = 'paid';
        exp.paid_at = new Date().toISOString();
        return exp;
      });
      if (!updated) {
        return NextResponse.json({ error: 'Lançamento não encontrado.' }, { status: 404 });
      }
      return NextResponse.json({ ok: true, expense: updated });
    }

    const parsed = CashRegisterActionSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message }, { status: 400 });
    }

    const auth = await requireAuthorizedSession({
      request,
      resource: 'financial',
      action: 'can_create',
      targetTenantId: parsed.data.tenantId,
    });
    if (!auth.ok) return auth.response;

    const effectiveTenantId =
      auth.session.roleCode === 'SUPER_ADMIN'
        ? parsed.data.tenantId
        : auth.session.tenant?.id!;

    const result = await mutateDb((db) => {
      const nowIso = new Date().toISOString();
      const { action, branchId, amount, description, category, entryKind, dueDate } = parsed.data;

      if (action === 'open') {
        const existingOpen = db.cash_registers.find(
          (r) => r.tenant_id === effectiveTenantId && r.branch_id === branchId && r.status === 'open'
        );
        if (existingOpen) {
          return { ok: false, error: 'Já existe um caixa aberto para esta unidade.' };
        }
        const reg = {
          id: uid('reg'),
          tenant_id: effectiveTenantId,
          branch_id: branchId,
          opened_by: auth.session.profile.id,
          opening_balance: amount,
          expected_closing_balance: amount,
          status: 'open' as const,
          notes: description || 'Abertura de caixa',
          opened_at: nowIso,
        };
        db.cash_registers.push(reg);
        return { ok: true, register: reg };
      }

      if (action === 'close') {
        const reg = db.cash_registers.find(
          (r) => r.tenant_id === effectiveTenantId && r.branch_id === branchId && r.status === 'open'
        );
        if (!reg) return { ok: false, error: 'Nenhum caixa aberto nesta unidade.' };
        reg.status = 'closed';
        reg.closed_by = auth.session.profile.id;
        reg.actual_closing_balance = amount;
        reg.closed_at = nowIso;
        appendAuditLog(db, {
          tenant_id: effectiveTenantId,
          actor_profile_id: auth.session.profile.id,
          action: 'CASH_REGISTER_CLOSED',
          entity: 'cash_registers',
          entity_id: reg.id,
          severity: 'info',
          details: { expected: reg.expected_closing_balance, actual: amount },
        });
        return { ok: true, register: reg };
      }

      if (action === 'bleed' || action === 'supply') {
        const reg = db.cash_registers.find(
          (r) => r.tenant_id === effectiveTenantId && r.branch_id === branchId && r.status === 'open'
        );
        if (!reg) return { ok: false, error: 'Abra um caixa nesta unidade antes de lançar sangria ou suprimento.' };
        if (amount <= 0) return { ok: false, error: 'Informe um valor positivo.' };

        const tx = {
          id: uid('ctx'),
          tenant_id: effectiveTenantId,
          branch_id: branchId,
          cash_register_id: reg.id,
          transaction_type: action,
          method: 'cash',
          amount,
          description:
            description || (action === 'bleed' ? 'Sangria de caixa' : 'Suprimento de caixa'),
          created_by: auth.session.profile.id,
          created_at: nowIso,
        };
        db.cash_transactions.push(tx);
        reg.expected_closing_balance = Number(
          (
            reg.expected_closing_balance +
            (action === 'supply' ? amount : -amount)
          ).toFixed(2)
        );
        return { ok: true, transaction: tx, register: reg };
      }

      // expense (conta a pagar ou receber)
      const expense = {
        id: uid('exp'),
        tenant_id: effectiveTenantId,
        branch_id: branchId,
        entry_kind: entryKind || 'payable',
        category: category || 'Operacional',
        description: description || 'Despesa operacional',
        amount,
        due_date: dueDate || nowIso.slice(0, 10),
        status: 'pending' as const,
        created_at: nowIso,
      };
      db.expenses.push(expense);
      return { ok: true, expense };
    });

    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }
    return NextResponse.json(result, { status: 201 });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Erro no caixa/financeiro.' },
      { status: 500 }
    );
  }
}
