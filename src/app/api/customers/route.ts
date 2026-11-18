import { NextResponse } from 'next/server';
import {
  CreateBarberSchema,
  CreateCustomerSchema,
  CreateReviewSchema,
  CreateServiceSchema,
} from '@/lib/validations/schemas';
import {
  addBarberWithPlanGuard,
  appendAuditLog,
  enqueueAndMaybeSendNotification,
  mutateDb,
  uid,
} from '@/lib/server/store';
import { requireAuthorizedSession } from '@/lib/server/request-auth';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const kind = body?.kind as string;

    // Avaliação de atendimento (pode ser enviada pelo cliente na página pública /s/[slug], validada contra duplicação)
    if (kind === 'review') {
      const parsed = CreateReviewSchema.safeParse(body);
      if (!parsed.success) {
        return NextResponse.json({ error: parsed.error.issues[0]?.message }, { status: 400 });
      }

      const result = await mutateDb((db) => {
        const appt = db.appointments.find(
          (a) =>
            a.id === parsed.data.appointmentId &&
            a.tenant_id === parsed.data.tenantId &&
            !a.deleted_at
        );
        if (!appt) {
          return { ok: false, status: 404, error: 'Atendimento não encontrado para avaliação.' };
        }
        if (appt.status !== 'completed') {
          return {
            ok: false,
            status: 400,
            error: 'Apenas atendimentos concluídos podem ser avaliados (controle anti-fraude).',
          };
        }
        const alreadyReviewed = db.reviews.some((r) => r.appointment_id === appt.id);
        if (alreadyReviewed) {
          return {
            ok: false,
            status: 409,
            error: 'Este atendimento já foi avaliado anteriormente.',
          };
        }

        const review = {
          id: uid('rev'),
          tenant_id: appt.tenant_id,
          branch_id: appt.branch_id,
          appointment_id: appt.id,
          customer_id: appt.customer_id,
          barber_id: appt.barber_id,
          barber_rating: parsed.data.barberRating,
          service_rating: parsed.data.serviceRating,
          ambience_rating: parsed.data.ambienceRating,
          overall_rating: parsed.data.overallRating,
          comment: parsed.data.comment,
          is_published: true,
          created_at: new Date().toISOString(),
        };
        db.reviews.unshift(review);

        const barber = db.barbers.find((b) => b.id === appt.barber_id);
        if (barber) {
          const barberReviews = db.reviews.filter((r) => r.barber_id === barber.id);
          barber.reviews_count = barberReviews.length;
          barber.rating_avg = Number(
            (
              barberReviews.reduce((acc, r) => acc + r.barber_rating, 0) /
              barberReviews.length
            ).toFixed(2)
          );
        }

        return { ok: true, status: 201, review };
      });

      if (!result.ok) {
        return NextResponse.json({ error: result.error }, { status: result.status });
      }
      return NextResponse.json({ ok: true, review: result.review }, { status: 201 });
    }

    if (kind === 'barber') {
      const auth = await requireAuthorizedSession({
        request,
        resource: 'barbers',
        action: 'can_create',
        targetTenantId: body?.tenantId,
      });
      if (!auth.ok) return auth.response;

      const parsed = CreateBarberSchema.safeParse(body);
      if (!parsed.success) {
        return NextResponse.json({ error: parsed.error.issues[0]?.message }, { status: 400 });
      }

      const result = await addBarberWithPlanGuard({
        ...parsed.data,
        actorProfileId: auth.session.profile.id,
      });
      if (!result.ok) {
        return NextResponse.json(
          { error: result.error, limitDetails: result.limitDetails },
          { status: result.statusCode || 400 }
        );
      }
      return NextResponse.json({ ok: true, barber: result.barber }, { status: 201 });
    }

    if (kind === 'service') {
      const auth = await requireAuthorizedSession({
        request,
        resource: 'services',
        action: 'can_create',
        targetTenantId: body?.tenantId,
      });
      if (!auth.ok) return auth.response;

      const parsed = CreateServiceSchema.safeParse(body);
      if (!parsed.success) {
        return NextResponse.json({ error: parsed.error.issues[0]?.message }, { status: 400 });
      }

      const service = await mutateDb((db) => {
        const created = {
          id: uid('svc'),
          tenant_id: parsed.data.tenantId,
          branch_id: parsed.data.branchId ?? null,
          name: parsed.data.name,
          description: parsed.data.description,
          category: parsed.data.category,
          audience: parsed.data.audience,
          duration_minutes: parsed.data.durationMinutes,
          buffer_minutes: parsed.data.bufferMinutes,
          price: parsed.data.price,
          cost_estimate: parsed.data.costEstimate,
          image_url:
            parsed.data.audience === 'female'
              ? '/assets/services/service-women-hair.jpg'
              : '/assets/services/service-haircut.jpg',
          is_featured: parsed.data.isFeatured,
          is_active: true,
          created_at: new Date().toISOString(),
        };
        db.services.push(created);
        return created;
      });
      return NextResponse.json({ ok: true, service }, { status: 201 });
    }

    if (kind === 'recover_inactive') {
      const auth = await requireAuthorizedSession({
        request,
        resource: 'customers',
        action: 'can_edit',
        targetTenantId: body?.tenantId,
      });
      if (!auth.ok) return auth.response;

      const result = await mutateDb(async (db) => {
        const tenant = db.tenants.find((t) => t.id === body.tenantId);
        const customer = db.customers.find(
          (c) => c.id === body.customerId && c.tenant_id === body.tenantId
        );
        if (!tenant || !customer) return { ok: false, error: 'Cliente não encontrado.' };

        const barber = db.barbers.find((b) => b.id === customer.preferred_barber_id) ??
          db.barbers.find((b) => b.tenant_id === tenant.id);

        const job = await enqueueAndMaybeSendNotification(db, {
          tenantId: tenant.id,
          triggerEvent: 'customer_inactive',
          customer,
          variables: {
            cliente: customer.full_name,
            barbeiro: barber?.name || 'nossa equipe',
            barbearia: tenant.name,
            link: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/s/${tenant.slug}`,
          },
        });
        return { ok: true, job };
      });
      if (!result.ok) return NextResponse.json({ error: result.error }, { status: 404 });
      return NextResponse.json(result);
    }

    // Criação de cliente no CRM
    const auth = await requireAuthorizedSession({
      request,
      resource: 'customers',
      action: 'can_create',
      targetTenantId: body?.tenantId,
    });
    if (!auth.ok) return auth.response;

    const parsed = CreateCustomerSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message }, { status: 400 });
    }

    const customer = await mutateDb((db) => {
      const nowIso = new Date().toISOString();
      const created = {
        id: uid('cust'),
        tenant_id: parsed.data.tenantId,
        branch_id: parsed.data.branchId ?? null,
        full_name: parsed.data.fullName,
        phone: parsed.data.phone,
        email: parsed.data.email || undefined,
        birth_date: parsed.data.birthDate,
        notes: parsed.data.notes,
        total_spent: 0,
        visits_count: 0,
        no_show_count: 0,
        cancelled_count: 0,
        marketing_opt_in: parsed.data.marketingOptIn,
        whatsapp_opt_in: parsed.data.whatsappOptIn,
        lgpd_consent_at: nowIso,
        created_at: nowIso,
      };
      db.customers.push(created);
      db.loyalty_accounts.push({
        id: uid('loy'),
        tenant_id: parsed.data.tenantId,
        customer_id: created.id,
        points_balance: 0,
        stamps_balance: 0,
        cashback_balance: 0,
        referral_code: `${created.full_name.slice(0, 4).toUpperCase()}-${Math.floor(1000 + Math.random() * 9000)}`,
        updated_at: nowIso,
      });
      appendAuditLog(db, {
        tenant_id: parsed.data.tenantId,
        actor_profile_id: auth.session.profile.id,
        action: 'CUSTOMER_CREATED',
        entity: 'customers',
        entity_id: created.id,
        severity: 'info',
        details: { fullName: created.full_name },
      });
      return created;
    });

    return NextResponse.json({ ok: true, customer }, { status: 201 });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Erro no módulo de clientes/equipe.' },
      { status: 500 }
    );
  }
}
