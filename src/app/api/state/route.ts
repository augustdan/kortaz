import { NextResponse } from 'next/server';
import { readDb } from '@/lib/server/store';
import { requireAuthorizedSession } from '@/lib/server/request-auth';
import { buildBusinessIntelligence } from '@/lib/domain/intelligence';
import { getTenantActivePlan } from '@/lib/domain/plan-limits';
import { isMercadoPagoConfigured } from '@/lib/integrations/mercadopago';
import { isWhatsAppConfigured } from '@/lib/integrations/whatsapp';
import { isResendConfigured } from '@/lib/integrations/resend';

/**
 * Retorna exclusivamente os dados pertencentes ao tenant do usuário autenticado.
 * Bloqueia acesso cruzado entre barbearias (isolamento multi-tenant).
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const requestedTenantId = url.searchParams.get('tenantId');

  const auth = await requireAuthorizedSession({
    request,
    resource: 'dashboard',
    action: 'can_view',
    targetTenantId: requestedTenantId,
  });

  if (!auth.ok) return auth.response;

  const { session } = auth;
  const db = await readDb();

  const tenantId =
    session.roleCode === 'SUPER_ADMIN'
      ? requestedTenantId || db.tenants[0]?.id
      : session.tenant?.id;

  if (!tenantId) {
    return NextResponse.json({ error: 'Tenant não associado à sessão.' }, { status: 400 });
  }

  const tenant = db.tenants.find((t) => t.id === tenantId && !t.deleted_at);
  if (!tenant) {
    return NextResponse.json({ error: 'Barbearia não encontrada.' }, { status: 404 });
  }

  const settings = db.tenant_settings.find((s) => s.tenant_id === tenantId);
  const branches = db.branches.filter((b) => b.tenant_id === tenantId && !b.deleted_at);
  const barbers = db.barbers.filter((b) => b.tenant_id === tenantId && !b.deleted_at);
  const services = db.services.filter((s) => s.tenant_id === tenantId && !s.deleted_at);
  const workingHours = db.working_hours.filter((w) => w.tenant_id === tenantId);
  const blockedTimes = db.blocked_times.filter((b) => b.tenant_id === tenantId);
  const customers = db.customers.filter((c) => c.tenant_id === tenantId && !c.deleted_at);
  const appointments = db.appointments.filter((a) => a.tenant_id === tenantId && !a.deleted_at);
  const appointmentServices = db.appointment_services.filter((a) => a.tenant_id === tenantId);
  const appointmentEvents = db.appointment_events.filter((e) => e.tenant_id === tenantId);
  const waitlistEntries = db.waitlist_entries.filter((w) => w.tenant_id === tenantId);
  const payments = db.payments.filter((p) => p.tenant_id === tenantId);
  const refunds = db.refunds.filter((r) => r.tenant_id === tenantId);
  const commissionRules = db.commission_rules.filter((c) => c.tenant_id === tenantId);
  const commissions = db.commissions.filter((c) => c.tenant_id === tenantId);
  const cashRegisters = db.cash_registers.filter((c) => c.tenant_id === tenantId);
  const cashTransactions = db.cash_transactions.filter((c) => c.tenant_id === tenantId);
  const expenses = db.expenses.filter((e) => e.tenant_id === tenantId);
  const suppliers = db.suppliers.filter((s) => s.tenant_id === tenantId);
  const products = db.products.filter((p) => p.tenant_id === tenantId && !p.deleted_at);
  const serviceConsumptions = db.service_product_consumptions.filter((c) => c.tenant_id === tenantId);
  const inventoryMovements = db.inventory_movements.filter((m) => m.tenant_id === tenantId);
  const loyaltyAccounts = db.loyalty_accounts.filter((l) => l.tenant_id === tenantId);
  const coupons = db.coupons.filter((c) => c.tenant_id === tenantId && c.scope === 'tenant');
  const reviews = db.reviews.filter((r) => r.tenant_id === tenantId);
  const notificationTemplates = db.notification_templates.filter((t) => t.tenant_id === tenantId);
  const notificationJobs = db.notification_jobs.filter((j) => j.tenant_id === tenantId);
  const roles = db.roles.filter((r) => r.tenant_id === tenantId);
  const permissions = db.permissions.filter((p) => p.tenant_id === tenantId);
  const auditLogs = db.audit_logs.filter((a) => a.tenant_id === tenantId).slice(0, 60);

  const { subscription, plan } = getTenantActivePlan({
    tenantId,
    subscriptions: db.subscriptions,
    plans: db.subscription_plans,
  });

  const intelligence = buildBusinessIntelligence({
    tenantId,
    appointments,
    customers,
    barbers,
    services,
    branches,
    settings,
    appointmentServices,
  });

  return NextResponse.json({
    session,
    tenant,
    settings,
    branches,
    barbers,
    services,
    workingHours,
    blockedTimes,
    customers,
    appointments,
    appointmentServices,
    appointmentEvents,
    waitlistEntries,
    payments,
    refunds,
    commissionRules,
    commissions,
    cashRegisters,
    cashTransactions,
    expenses,
    suppliers,
    products,
    serviceConsumptions,
    inventoryMovements,
    loyaltyAccounts,
    coupons,
    reviews,
    notificationTemplates,
    notificationJobs,
    roles,
    permissions,
    auditLogs,
    subscription,
    plan,
    allPlans: db.subscription_plans,
    planFeatures: db.subscription_features,
    subscriptionEvents: db.subscription_events.filter((e) => e.tenant_id === tenantId),
    intelligence,
    integrationsStatus: {
      mercadopagoConfigured: isMercadoPagoConfigured(),
      whatsappConfigured: isWhatsAppConfigured(),
      resendConfigured: isResendConfigured(),
    },
  });
}
