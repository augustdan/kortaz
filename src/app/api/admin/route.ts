import { NextResponse } from 'next/server';
import {
  addBranchWithPlanGuard,
  appendAuditLog,
  mutateDb,
  readDb,
  uid,
} from '@/lib/server/store';
import { requireAuthorizedSession } from '@/lib/server/request-auth';
import type { PlanCode, TenantStatus } from '@/lib/types/domain';

export async function GET(request: Request) {
  const auth = await requireAuthorizedSession({
    request,
    resource: 'super_admin',
    action: 'can_view',
  });
  if (!auth.ok) return auth.response;

  const db = await readDb();
  const activeTenants = db.tenants.filter((t) => !t.deleted_at);
  const subs = db.subscriptions;

  const paidSubs = subs.filter((s) => {
    const plan = db.subscription_plans.find((p) => p.id === s.plan_id);
    return s.status === 'active' && plan && plan.price_monthly > 0;
  });

  const mrr = paidSubs.reduce((acc, s) => {
    const plan = db.subscription_plans.find((p) => p.id === s.plan_id);
    const price = plan ? plan.price_monthly : s.price_at_subscription;
    return acc + Math.max(0, price - s.discount_amount);
  }, 0);

  const cancelledSubs = subs.filter((s) => s.status === 'cancelled').length;
  const churnRate =
    subs.length > 0 ? Number(((cancelledSubs / subs.length) * 100).toFixed(1)) : 0;

  return NextResponse.json({
    metrics: {
      totalBarbershops: activeTenants.length,
      activeAccounts: activeTenants.filter((t) => t.status === 'active' || t.status === 'trialing').length,
      freeAccounts: subs.filter((s) => {
        const p = db.subscription_plans.find((pl) => pl.id === s.plan_id);
        return p?.code === 'free';
      }).length,
      paidSubscribers: paidSubs.length,
      mrr: Number(mrr.toFixed(2)),
      arr: Number((mrr * 12).toFixed(2)),
      churnRate,
      cancelledSubscriptions: cancelledSubs,
      platformRevenueMonth: Number(mrr.toFixed(2)),
    },
    tenants: activeTenants,
    plans: db.subscription_plans,
    features: db.subscription_features,
    subscriptions: db.subscriptions,
    subscriptionEvents: db.subscription_events,
    saasCoupons: db.coupons.filter((c) => c.scope === 'saas'),
    auditLogs: db.audit_logs.slice(0, 100),
    notificationFailures: db.notification_jobs.filter((j) => j.status === 'failed' || j.status === 'integration_not_configured'),
    platformSettings: db.platform_settings,
  });
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const action = body?.action as string;

    // Ações do Tenant (Proprietário alterando assinatura, unidade ou permissões/configurações)
    if (action === 'change_tenant_plan') {
      const auth = await requireAuthorizedSession({
        request,
        resource: 'subscription',
        action: 'can_edit',
        targetTenantId: body?.tenantId,
      });
      if (!auth.ok) return auth.response;

      const tenantId =
        auth.session.roleCode === 'SUPER_ADMIN'
          ? body.tenantId
          : auth.session.tenant?.id;

      const result = await mutateDb((db) => {
        const plan = db.subscription_plans.find(
          (p) => p.code === (body.planCode as PlanCode) || p.id === body.planId
        );
        if (!plan) return { ok: false, error: 'Plano não encontrado.' };

        const sub = db.subscriptions.find((s) => s.tenant_id === tenantId);
        if (!sub) return { ok: false, error: 'Assinatura não localizada.' };

        const oldPlan = db.subscription_plans.find((p) => p.id === sub.plan_id);

        let discount = 0;
        let couponCode: string | null = null;
        if (body.couponCode) {
          const coupon = db.coupons.find(
            (c) =>
              c.scope === 'saas' &&
              c.is_active &&
              c.code.toUpperCase() === String(body.couponCode).toUpperCase()
          );
          if (coupon) {
            discount =
              coupon.discount_type === 'percentage'
                ? Number(((plan.price_monthly * coupon.discount_value) / 100).toFixed(2))
                : Math.min(plan.price_monthly, coupon.discount_value);
            coupon.used_count += 1;
            couponCode = coupon.code;
          }
        }

        const isUpgrade =
          !oldPlan || plan.sort_order >= oldPlan.sort_order;
        sub.plan_id = plan.id;
        sub.price_at_subscription = plan.price_monthly;
        sub.discount_amount = discount;
        sub.coupon_code = couponCode;
        sub.status = 'active';
        sub.cancelled_at = null;

        const tenant = db.tenants.find((t) => t.id === tenantId);
        if (tenant && tenant.status === 'suspended') {
          tenant.status = 'active';
        }

        db.subscription_events.unshift({
          id: uid('sevt'),
          tenant_id: tenantId,
          subscription_id: sub.id,
          event_type: isUpgrade ? 'upgraded' : 'downgraded',
          from_plan_code: oldPlan?.code ?? null,
          to_plan_code: plan.code,
          amount: Math.max(0, plan.price_monthly - discount),
          metadata: { couponCode },
          created_at: new Date().toISOString(),
        });

        appendAuditLog(db, {
          tenant_id: tenantId,
          actor_profile_id: auth.session.profile.id,
          actor_role: auth.session.roleCode,
          action: isUpgrade ? 'SUBSCRIPTION_UPGRADED' : 'SUBSCRIPTION_DOWNGRADED',
          entity: 'subscriptions',
          entity_id: sub.id,
          severity: 'info',
          details: { from: oldPlan?.code, to: plan.code, discount },
        });

        return { ok: true, subscription: sub, plan };
      });

      if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 });
      return NextResponse.json(result);
    }

    if (action === 'create_branch') {
      const auth = await requireAuthorizedSession({
        request,
        resource: 'settings',
        action: 'can_create',
        targetTenantId: body?.tenantId,
      });
      if (!auth.ok) return auth.response;

      const tenantId =
        auth.session.roleCode === 'SUPER_ADMIN'
          ? body.tenantId
          : auth.session.tenant?.id!;

      const res = await addBranchWithPlanGuard({
        tenantId,
        name: body.name,
        address: body.address,
        city: body.city,
        state: body.state,
        phone: body.phone,
        openingHoursLabel: body.openingHoursLabel,
        actorProfileId: auth.session.profile.id,
      });
      if (!res.ok) {
        return NextResponse.json(
          { error: res.error, limitDetails: res.limitDetails },
          { status: res.statusCode || 400 }
        );
      }
      return NextResponse.json(res, { status: 201 });
    }

    if (action === 'update_tenant_settings') {
      const auth = await requireAuthorizedSession({
        request,
        resource: 'settings',
        action: 'can_edit',
        targetTenantId: body?.tenantId,
      });
      if (!auth.ok) return auth.response;

      const tenantId =
        auth.session.roleCode === 'SUPER_ADMIN'
          ? body.tenantId
          : auth.session.tenant?.id!;

      const updated = await mutateDb((db) => {
        const tenant = db.tenants.find((t) => t.id === tenantId);
        const settings = db.tenant_settings.find((s) => s.tenant_id === tenantId);
        if (tenant) {
          if (body.name) tenant.name = body.name;
          if (body.description) tenant.description = body.description;
          if (body.phone) tenant.phone = body.phone;
          if (body.email) tenant.email = body.email;
          tenant.updated_at = new Date().toISOString();
        }
        if (settings) {
          if (typeof body.bookingAutoConfirm === 'boolean')
            settings.booking_auto_confirm = body.bookingAutoConfirm;
          if (typeof body.cancellationPolicyHours === 'number')
            settings.cancellation_policy_hours = body.cancellationPolicyHours;
          if (typeof body.requireDeposit === 'boolean')
            settings.require_deposit = body.requireDeposit;
          if (typeof body.depositPercentage === 'number')
            settings.deposit_percentage = body.depositPercentage;
          if (typeof body.loyaltyCutsTarget === 'number')
            settings.loyalty_cuts_target = body.loyaltyCutsTarget;
          if (typeof body.cashbackPercent === 'number')
            settings.cashback_percent = body.cashbackPercent;
          if (body.customPublicHeadline)
            settings.custom_public_headline = body.customPublicHeadline;
        }
        return { tenant, settings };
      });
      return NextResponse.json({ ok: true, ...updated });
    }

    if (action === 'update_permission') {
      const auth = await requireAuthorizedSession({
        request,
        resource: 'settings',
        action: 'can_edit',
        targetTenantId: body?.tenantId,
      });
      if (!auth.ok) return auth.response;

      const perm = await mutateDb((db) => {
        const found = db.permissions.find(
          (p) => p.id === body.permissionId && p.tenant_id === auth.session.tenant?.id
        );
        if (!found) return null;
        if (typeof body.canView === 'boolean') found.can_view = body.canView;
        if (typeof body.canCreate === 'boolean') found.can_create = body.canCreate;
        if (typeof body.canEdit === 'boolean') found.can_edit = body.canEdit;
        if (typeof body.canDelete === 'boolean') found.can_delete = body.canDelete;
        return found;
      });
      if (!perm) return NextResponse.json({ error: 'Permissão não localizada.' }, { status: 404 });
      return NextResponse.json({ ok: true, permission: perm });
    }

    // Ações Exclusivas do SUPER ADMIN
    const superAuth = await requireAuthorizedSession({
      request,
      resource: 'super_admin',
      action: 'can_edit',
    });
    if (!superAuth.ok) return superAuth.response;

    if (action === 'update_plan') {
      const plan = await mutateDb((db) => {
        const target = db.subscription_plans.find((p) => p.id === body.planId);
        if (!target) return null;
        if (typeof body.name === 'string') target.name = body.name;
        if (typeof body.priceMonthly === 'number') target.price_monthly = body.priceMonthly;
        if (body.maxBarbers !== undefined) target.max_barbers = body.maxBarbers;
        if (body.maxMonthlyAppointments !== undefined)
          target.max_monthly_appointments = body.maxMonthlyAppointments;
        if (typeof body.maxBranches === 'number') target.max_branches = body.maxBranches;
        if (typeof body.isActive === 'boolean') target.is_active = body.isActive;

        appendAuditLog(db, {
          tenant_id: null,
          actor_profile_id: superAuth.session.profile.id,
          actor_role: 'SUPER_ADMIN',
          action: 'SAAS_PLAN_UPDATED',
          entity: 'subscription_plans',
          entity_id: target.id,
          severity: 'warning',
          details: { price: target.price_monthly, maxBarbers: target.max_barbers },
        });
        return target;
      });
      if (!plan) return NextResponse.json({ error: 'Plano não encontrado.' }, { status: 404 });
      return NextResponse.json({ ok: true, plan });
    }

    if (action === 'set_tenant_status') {
      const tenant = await mutateDb((db) => {
        const target = db.tenants.find((t) => t.id === body.targetTenantId);
        if (!target) return null;
        target.status = body.status as TenantStatus;
        target.updated_at = new Date().toISOString();

        const sub = db.subscriptions.find((s) => s.tenant_id === target.id);
        if (sub) {
          sub.status = body.status === 'suspended' ? 'suspended' : 'active';
        }

        appendAuditLog(db, {
          tenant_id: target.id,
          actor_profile_id: superAuth.session.profile.id,
          actor_role: 'SUPER_ADMIN',
          action: body.status === 'suspended' ? 'TENANT_SUSPENDED' : 'TENANT_REACTIVATED',
          entity: 'tenants',
          entity_id: target.id,
          severity: 'critical',
          details: { status: body.status },
        });
        return target;
      });
      if (!tenant) return NextResponse.json({ error: 'Barbearia não encontrada.' }, { status: 404 });
      return NextResponse.json({ ok: true, tenant });
    }

    if (action === 'create_saas_coupon') {
      const coupon = await mutateDb((db) => {
        const created = {
          id: uid('cup'),
          tenant_id: null,
          scope: 'saas' as const,
          code: String(body.code || 'BARBEROS').toUpperCase().trim(),
          description: String(body.description || 'Cupom promocional SaaS'),
          discount_type: body.discountType === 'fixed' ? ('fixed' as const) : ('percentage' as const),
          discount_value: Number(body.discountValue || 15),
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

    if (action === 'update_platform_settings') {
      const settings = await mutateDb((db) => {
        if (typeof body.supportEmail === 'string')
          db.platform_settings.support_email = body.supportEmail;
        if (typeof body.defaultTrialDays === 'number')
          db.platform_settings.default_trial_days = body.defaultTrialDays;
        if (typeof body.maintenanceMode === 'boolean')
          db.platform_settings.maintenance_mode = body.maintenanceMode;
        return db.platform_settings;
      });
      return NextResponse.json({ ok: true, platformSettings: settings });
    }

    return NextResponse.json({ error: 'Ação administrativa não suportada.' }, { status: 400 });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Erro no painel administrativo.' },
      { status: 500 }
    );
  }
}
