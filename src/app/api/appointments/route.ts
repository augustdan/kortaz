import { NextResponse } from 'next/server';
import {
  CreateAppointmentSchema,
  CreateBlockedTimeSchema,
  CreateWaitlistSchema,
} from '@/lib/validations/schemas';
import {
  appendAuditLog,
  createAppointmentTransactional,
  mutateDb,
  readDb,
  uid,
} from '@/lib/server/store';
import { getRequestSession, requireAuthorizedSession } from '@/lib/server/request-auth';
import { checkRateLimit } from '@/lib/server/rate-limit';

export async function GET(request: Request) {
  const url = new URL(request.url);
  const tenantId = url.searchParams.get('tenantId');
  const auth = await requireAuthorizedSession({
    request,
    resource: 'appointments',
    action: 'can_view',
    targetTenantId: tenantId,
  });
  if (!auth.ok) return auth.response;

  const db = await readDb();
  const effectiveTenantId =
    auth.session.roleCode === 'SUPER_ADMIN'
      ? tenantId || db.tenants[0]?.id
      : auth.session.tenant?.id;

  const appointments = db.appointments.filter(
    (a) => a.tenant_id === effectiveTenantId && !a.deleted_at
  );
  return NextResponse.json({ appointments });
}

export async function POST(request: Request) {
  try {
    const ip = request.headers.get('x-forwarded-for') || 'local';
    const rl = checkRateLimit({ key: `book:${ip}`, maxRequests: 60, windowMs: 60_000 });
    if (!rl.allowed) {
      return NextResponse.json(
        { error: 'Limite de requisições excedido. Tente novamente em instantes.' },
        { status: 429 }
      );
    }

    const body = await request.json();

    // Sub-ação: Bloqueio de horário / folga / férias
    if (body?.kind === 'blocked_time') {
      const auth = await requireAuthorizedSession({
        request,
        resource: 'agenda',
        action: 'can_create',
        targetTenantId: body.tenantId,
      });
      if (!auth.ok) return auth.response;

      const parsed = CreateBlockedTimeSchema.safeParse(body);
      if (!parsed.success) {
        return NextResponse.json({ error: parsed.error.issues[0]?.message }, { status: 400 });
      }
      if (new Date(parsed.data.endsAt) <= new Date(parsed.data.startsAt)) {
        return NextResponse.json(
          { error: 'Horário final do bloqueio deve ser maior que o inicial.' },
          { status: 400 }
        );
      }

      const block = await mutateDb((db) => {
        const created = {
          id: uid('block'),
          tenant_id: parsed.data.tenantId,
          branch_id: parsed.data.branchId,
          barber_id: parsed.data.barberId,
          reason: parsed.data.reason,
          block_type: parsed.data.blockType,
          starts_at: parsed.data.startsAt,
          ends_at: parsed.data.endsAt,
          created_at: new Date().toISOString(),
        };
        db.blocked_times.push(created);
        appendAuditLog(db, {
          tenant_id: parsed.data.tenantId,
          actor_profile_id: auth.session.profile.id,
          actor_role: auth.session.roleCode,
          action: 'TIME_BLOCKED',
          entity: 'blocked_times',
          entity_id: created.id,
          severity: 'info',
          details: { reason: created.reason, barberId: created.barber_id },
        });
        return created;
      });

      return NextResponse.json({ ok: true, blockedTime: block }, { status: 201 });
    }

    // Sub-ação: Entrada na lista de espera automática
    if (body?.kind === 'waitlist') {
      const parsed = CreateWaitlistSchema.safeParse(body);
      if (!parsed.success) {
        return NextResponse.json({ error: parsed.error.issues[0]?.message }, { status: 400 });
      }

      const entry = await mutateDb((db) => {
        const nowIso = new Date().toISOString();
        const cleanPhone = parsed.data.customerPhone.replace(/\D/g, '');
        let customer = db.customers.find(
          (c) => c.tenant_id === parsed.data.tenantId && c.phone.replace(/\D/g, '') === cleanPhone
        );
        if (!customer) {
          customer = {
            id: uid('cust'),
            tenant_id: parsed.data.tenantId,
            branch_id: parsed.data.branchId,
            full_name: parsed.data.customerName,
            phone: parsed.data.customerPhone,
            email: parsed.data.customerEmail || undefined,
            total_spent: 0,
            visits_count: 0,
            no_show_count: 0,
            cancelled_count: 0,
            marketing_opt_in: true,
            whatsapp_opt_in: true,
            lgpd_consent_at: nowIso,
            created_at: nowIso,
          };
          db.customers.push(customer);
        }

        const wait = {
          id: uid('wait'),
          tenant_id: parsed.data.tenantId,
          branch_id: parsed.data.branchId,
          customer_id: customer.id,
          barber_id: parsed.data.barberId ?? null,
          service_id: parsed.data.serviceId,
          desired_date: parsed.data.desiredDate,
          desired_period: parsed.data.desiredPeriod,
          status: 'waiting' as const,
          created_at: nowIso,
        };
        db.waitlist_entries.push(wait);
        return wait;
      });

      return NextResponse.json({ ok: true, waitlistEntry: entry }, { status: 201 });
    }

    // Criação de agendamento (público /s/[slug] ou autenticado pelo painel)
    const parsed = CreateAppointmentSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || 'Dados de agendamento inválidos.' },
        { status: 400 }
      );
    }

    const session = await getRequestSession(request);
    if (
      parsed.data.source !== 'online' &&
      (!session ||
        (session.roleCode !== 'SUPER_ADMIN' && session.tenant?.id !== parsed.data.tenantId))
    ) {
      return NextResponse.json(
        { error: 'Autenticação necessária no tenant para agendamentos administrativos.' },
        { status: 403 }
      );
    }

    const result = await createAppointmentTransactional({
      ...parsed.data,
      actorProfileId: session?.profile.id ?? null,
    });

    if (!result.ok) {
      return NextResponse.json(
        { error: result.error, limitDetails: result.limitDetails },
        { status: result.statusCode || 400 }
      );
    }

    return NextResponse.json(
      {
        ok: true,
        appointment: result.appointment,
        barber: result.barber,
        customer: result.customer,
      },
      { status: 201 }
    );
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Erro ao criar agendamento.' },
      { status: 500 }
    );
  }
}
