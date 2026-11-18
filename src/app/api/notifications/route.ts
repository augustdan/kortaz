import { NextResponse } from 'next/server';
import { mutateDb, uid } from '@/lib/server/store';
import { requireAuthorizedSession } from '@/lib/server/request-auth';
import { dispatchWhatsAppMessage } from '@/lib/integrations/whatsapp';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const action = body?.action as string;

    const auth = await requireAuthorizedSession({
      request,
      resource: 'marketing',
      action: 'can_edit',
      targetTenantId: body?.tenantId,
    });
    if (!auth.ok) return auth.response;

    const tenantId =
      auth.session.roleCode === 'SUPER_ADMIN'
        ? body?.tenantId
        : auth.session.tenant?.id;

    if (!tenantId) {
      return NextResponse.json({ error: 'Tenant não identificado.' }, { status: 400 });
    }

    if (action === 'update_template') {
      const updated = await mutateDb((db) => {
        const tpl = db.notification_templates.find(
          (t) => t.id === body.templateId && t.tenant_id === tenantId
        );
        if (!tpl) return null;
        if (typeof body.isActive === 'boolean') tpl.is_active = body.isActive;
        if (typeof body.bodyTemplate === 'string') tpl.body_template = body.bodyTemplate;
        if (typeof body.channel === 'string') tpl.channel = body.channel;
        tpl.updated_at = new Date().toISOString();
        return tpl;
      });
      if (!updated) return NextResponse.json({ error: 'Template não localizado.' }, { status: 404 });
      return NextResponse.json({ ok: true, template: updated });
    }

    if (action === 'create_coupon') {
      const coupon = await mutateDb((db) => {
        const created = {
          id: uid('cup'),
          tenant_id: tenantId,
          scope: 'tenant' as const,
          code: String(body.code || 'PROMO10').toUpperCase().trim(),
          description: String(body.description || 'Campanha promocional'),
          discount_type: body.discountType === 'fixed' ? ('fixed' as const) : ('percentage' as const),
          discount_value: Number(body.discountValue || 10),
          max_uses: body.maxUses ? Number(body.maxUses) : null,
          used_count: 0,
          is_active: true,
          created_at: new Date().toISOString(),
        };
        db.coupons.push(created);
        return created;
      });
      return NextResponse.json({ ok: true, coupon }, { status: 201 });
    }

    if (action === 'retry_job') {
      const result = await mutateDb(async (db) => {
        const job = db.notification_jobs.find(
          (j) => j.id === body.jobId && j.tenant_id === tenantId
        );
        if (!job) return { ok: false, error: 'Job não encontrado.' };
        const dispatch = await dispatchWhatsAppMessage({
          toPhone: job.recipient,
          message: job.rendered_message,
        });
        job.attempts += 1;
        job.status = dispatch.status;
        job.last_error = dispatch.error ?? null;
        db.notification_logs.unshift({
          id: uid('nlog'),
          tenant_id: tenantId,
          job_id: job.id,
          provider: 'whatsapp_cloud_api',
          provider_message_id: dispatch.providerMessageId ?? null,
          status: dispatch.status,
          response_payload: dispatch.payload,
          created_at: new Date().toISOString(),
        });
        return { ok: true, job };
      });
      if (!result.ok) return NextResponse.json({ error: result.error }, { status: 404 });
      return NextResponse.json(result);
    }

    return NextResponse.json({ error: 'Ação inválida.' }, { status: 400 });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Erro no módulo de marketing.' },
      { status: 500 }
    );
  }
}
