import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import type {
  Appointment,
  AuditLog,
  Barber,
  Branch,
  CashTransaction,
  Commission,
  Customer,
  DatabaseState,
  NotificationJob,
  NotificationTrigger,
  Payment,
  RoleCode,
  SessionContext,
} from '@/lib/types/domain';
import { createInitialSeedState, buildDefaultNotificationTemplates, buildTenantRolesAndPermissions } from '@/lib/server/seed-data';
import { hashPassword, verifyPassword } from '@/lib/server/auth-crypto';
import {
  checkBarberSlotAvailability,
  computeServicesDurationAndPrice,
  getZonedDateParts,
} from '@/lib/domain/scheduling';
import { buildCommissionRecords } from '@/lib/domain/commissions';
import {
  checkBarberCreationLimit,
  checkBranchCreationLimit,
  checkMonthlyAppointmentLimit,
  getTenantActivePlan,
} from '@/lib/domain/plan-limits';
import { dispatchWhatsAppMessage, renderNotificationTemplate } from '@/lib/integrations/whatsapp';
import { dispatchTransactionalEmail } from '@/lib/integrations/resend';

function getDataFilePath(): string {
  if (process.env.BARBEROS_DATA_FILE) return process.env.BARBEROS_DATA_FILE;
  const baseDir = process.env.VERCEL ? os.tmpdir() : path.join(process.cwd(), '.data');
  return path.join(baseDir, 'barberos-store.json');
}

// Mutex em memória para evitar condições de corrida em gravações simultâneas no arquivo e agendamentos concorrentes
let writeQueue: Promise<unknown> = Promise.resolve();

export async function readDb(): Promise<DatabaseState> {
  const filePath = getDataFilePath();
  try {
    const raw = await fs.readFile(/*turbopackIgnore: true*/ filePath, 'utf8');
    return JSON.parse(raw) as DatabaseState;
  } catch {
    const initial = createInitialSeedState();
    await fs.mkdir(/*turbopackIgnore: true*/ path.dirname(filePath), { recursive: true });
    await fs.writeFile(/*turbopackIgnore: true*/ filePath, JSON.stringify(initial, null, 2), 'utf8');
    return initial;
  }
}

export async function mutateDb<T>(mutator: (db: DatabaseState) => Promise<T> | T): Promise<T> {
  const run = writeQueue.then(async () => {
    const db = await readDb();
    const result = await mutator(db);
    const filePath = getDataFilePath();
    await fs.mkdir(/*turbopackIgnore: true*/ path.dirname(filePath), { recursive: true });
    await fs.writeFile(/*turbopackIgnore: true*/ filePath, JSON.stringify(db, null, 2), 'utf8');
    return result;
  });

  writeQueue = run.catch(() => undefined);
  return run;
}

export async function resetDbForTesting(customState?: DatabaseState): Promise<void> {
  const state = customState ?? createInitialSeedState();
  const filePath = getDataFilePath();
  await fs.mkdir(/*turbopackIgnore: true*/ path.dirname(filePath), { recursive: true });
  await fs.writeFile(/*turbopackIgnore: true*/ filePath, JSON.stringify(state, null, 2), 'utf8');
}

export function uid(prefix = 'id'): string {
  return `${prefix}-${crypto.randomUUID()}`;
}

export function appendAuditLog(
  db: DatabaseState,
  entry: Omit<AuditLog, 'id' | 'created_at'>
): void {
  db.audit_logs.unshift({
    id: uid('aud'),
    created_at: new Date().toISOString(),
    ...entry,
  });
  if (db.audit_logs.length > 500) {
    db.audit_logs = db.audit_logs.slice(0, 500);
  }
}

export function resolveSessionContext(
  db: DatabaseState,
  profileId: string | null | undefined,
  tenantIdOverride?: string | null
): SessionContext | null {
  if (!profileId) return null;
  const profile = db.profiles.find((p) => p.id === profileId);
  if (!profile) return null;

  const { password_hash: _omit, ...safeProfile } = profile;
  void _omit;

  if (profile.is_super_admin) {
    const tenant = tenantIdOverride
      ? db.tenants.find((t) => t.id === tenantIdOverride && !t.deleted_at) ?? null
      : null;
    return {
      profile: safeProfile,
      membership: null,
      tenant,
      roleCode: 'SUPER_ADMIN',
    };
  }

  const membership =
    db.memberships.find(
      (m) =>
        m.profile_id === profile.id &&
        m.is_active &&
        (!tenantIdOverride || m.tenant_id === tenantIdOverride)
    ) ?? null;

  const tenant = membership
    ? db.tenants.find((t) => t.id === membership.tenant_id && !t.deleted_at) ?? null
    : null;

  return {
    profile: safeProfile,
    membership,
    tenant,
    roleCode: membership?.role_code ?? 'CUSTOMER',
  };
}

export async function authenticateUser(params: {
  email: string;
  password: string;
  tenantSlug?: string;
}): Promise<{ ok: boolean; error?: string; context?: SessionContext }> {
  const db = await readDb();
  const profile = db.profiles.find(
    (p) => p.email.toLowerCase() === params.email.trim().toLowerCase()
  );
  if (!profile || !verifyPassword(params.password, profile.password_hash)) {
    return { ok: false, error: 'E-mail ou senha inválidos.' };
  }

  let tenantId: string | null = null;
  if (params.tenantSlug) {
    const t = db.tenants.find((x) => x.slug === params.tenantSlug && !x.deleted_at);
    if (t) tenantId = t.id;
  }

  const ctx = resolveSessionContext(db, profile.id, tenantId);
  if (!ctx) return { ok: false, error: 'Sessão indisponível para este usuário.' };

  if (ctx.tenant && ctx.tenant.status === 'suspended' && ctx.roleCode !== 'SUPER_ADMIN') {
    return {
      ok: false,
      error: 'Conta da barbearia suspensa. Contate o suporte ou regularize a assinatura.',
    };
  }

  return { ok: true, context: ctx };
}

export async function registerTenantAccount(params: {
  ownerName: string;
  email: string;
  phone: string;
  password: string;
  barbershopName: string;
  slug: string;
  businessType?: 'barbershop' | 'salon' | 'unisex';
  city: string;
  state: string;
  address: string;
  planCode: 'free' | 'starter' | 'pro' | 'premium' | 'business' | 'enterprise';
}): Promise<{ ok: boolean; error?: string; tenantId?: string; profileId?: string; slug?: string }> {
  return mutateDb((db) => {
    const emailTaken = db.profiles.some(
      (p) => p.email.toLowerCase() === params.email.trim().toLowerCase()
    );
    if (emailTaken) {
      return { ok: false, error: 'Já existe uma conta cadastrada com este e-mail.' };
    }

    const slugTaken = db.tenants.some(
      (t) => t.slug.toLowerCase() === params.slug.trim().toLowerCase() && !t.deleted_at
    );
    if (slugTaken) {
      return { ok: false, error: 'Este endereço (/s/' + params.slug + ') já está em uso.' };
    }

    const nowIso = new Date().toISOString();
    const tenantId = uid('tenant');
    const branchId = uid('branch');
    const profileId = uid('profile');
    const barberId = uid('barber');
    const businessType = params.businessType || 'unisex';

    const plan =
      db.subscription_plans.find((p) => p.code === params.planCode) ??
      db.subscription_plans[0];

    db.tenants.push({
      id: tenantId,
      name: params.barbershopName.trim(),
      slug: params.slug.trim().toLowerCase(),
      business_type: businessType,
      phone: params.phone,
      email: params.email,
      logo_url: '/assets/brand/logo-primary.svg',
      cover_url:
        businessType === 'salon'
          ? '/assets/hero/hero-hud-woman-salon.jpg'
          : '/assets/hero/hero-hud-barber-man.jpg',
      description: `Bem-vindo à ${params.barbershopName}. Atendimento premium e agendamento online instantâneo.`,
      status: plan.trial_days > 0 ? 'trialing' : 'active',
      created_at: nowIso,
      updated_at: nowIso,
      deleted_at: null,
    });

    db.tenant_settings.push({
      id: uid('settings'),
      tenant_id: tenantId,
      primary_color: '#0E0906',
      accent_color: '#D49B6A',
      booking_auto_confirm: true,
      cancellation_policy_hours: 4,
      require_deposit: false,
      deposit_percentage: 25,
      loyalty_cuts_target: 10,
      loyalty_reward_label: 'Corte Cortesia',
      cashback_percent: 5,
      inactive_days_threshold: 45,
      whatsapp_enabled: false,
      mercadopago_enabled: false,
      google_calendar_enabled: false,
      lgpd_dpo_email: params.email,
      custom_public_headline: 'Seu estilo, nossa paixão.',
      custom_public_subheadline: `Agende seu horário na ${params.barbershopName}.`,
    });

    const branch: Branch = {
      id: branchId,
      tenant_id: tenantId,
      name: `${params.barbershopName} — Matriz`,
      slug: 'matriz',
      address: params.address,
      city: params.city,
      state: params.state.toUpperCase(),
      phone: params.phone,
      timezone: 'America/Sao_Paulo',
      opening_hours_label: 'SEG - SÁB: 09h às 20h',
      is_headquarters: true,
      is_active: true,
      created_at: nowIso,
      deleted_at: null,
    };
    db.branches.push(branch);

    db.profiles.push({
      id: profileId,
      email: params.email.trim().toLowerCase(),
      password_hash: hashPassword(params.password),
      full_name: params.ownerName.trim(),
      phone: params.phone,
      is_super_admin: false,
      created_at: nowIso,
    });

    const rbac = buildTenantRolesAndPermissions(tenantId);
    db.roles.push(...rbac.roles);
    db.permissions.push(...rbac.permissions);

    const ownerRole = rbac.roles.find((r) => r.code === 'OWNER')!;
    db.memberships.push({
      id: uid('mem'),
      tenant_id: tenantId,
      branch_id: branchId,
      profile_id: profileId,
      role_id: ownerRole.id,
      role_code: 'OWNER',
      is_active: true,
      created_at: nowIso,
    });

    // Cria profissional titular inicial + serviço padrão para já começar operacional
    const starterBarber: Barber = {
      id: barberId,
      tenant_id: tenantId,
      branch_id: branchId,
      profile_id: profileId,
      name: params.ownerName.trim(),
      specialty: 'Corte & Barba',
      bio: 'Fundador e barbeiro titular.',
      avatar_url: '/assets/barbers/barber-lucas.jpg',
      phone: params.phone,
      email: params.email,
      rating_avg: 5.0,
      reviews_count: 0,
      monthly_revenue_goal: 5000,
      default_commission_percent: 50,
      is_active: true,
      created_at: nowIso,
    };
    db.barbers.push(starterBarber);

    for (let dow = 0; dow <= 6; dow++) {
      db.working_hours.push({
        id: uid('wh'),
        tenant_id: tenantId,
        branch_id: branchId,
        barber_id: barberId,
        day_of_week: dow,
        start_time: '09:00',
        end_time: '20:00',
        break_start: '12:00',
        break_end: '13:00',
        is_day_off: dow === 0,
      });
    }

    db.services.push(
      {
        id: uid('svc'),
        tenant_id: tenantId,
        branch_id: branchId,
        name: 'Corte de Cabelo',
        description: 'Corte masculino completo com lavagem e finalização.',
        category: 'Cabelo',
        duration_minutes: 30,
        buffer_minutes: 5,
        price: 50,
        cost_estimate: 8,
        image_url: '/assets/services/service-haircut.jpg',
        is_featured: true,
        is_active: true,
        created_at: nowIso,
      },
      {
        id: uid('svc'),
        tenant_id: tenantId,
        branch_id: branchId,
        name: 'Barba Completa',
        description: 'Alinhamento à navalha com toalha quente.',
        category: 'Barba',
        duration_minutes: 30,
        buffer_minutes: 5,
        price: 40,
        cost_estimate: 7,
        image_url: '/assets/services/service-beard.jpg',
        is_featured: true,
        is_active: true,
        created_at: nowIso,
      }
    );

    db.notification_templates.push(...buildDefaultNotificationTemplates(tenantId, nowIso));

    const subId = uid('sub');
    const periodEnd = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
    const trialEnds =
      plan.trial_days > 0
        ? new Date(Date.now() + plan.trial_days * 24 * 60 * 60 * 1000).toISOString()
        : null;

    db.subscriptions.push({
      id: subId,
      tenant_id: tenantId,
      plan_id: plan.id,
      status: plan.trial_days > 0 ? 'trialing' : 'active',
      billing_cycle: 'monthly',
      price_at_subscription: plan.price_monthly,
      discount_amount: 0,
      current_period_start: nowIso,
      current_period_end: periodEnd,
      trial_ends_at: trialEnds,
      created_at: nowIso,
    });

    db.subscription_events.push({
      id: uid('sevt'),
      tenant_id: tenantId,
      subscription_id: subId,
      event_type: 'created',
      to_plan_code: plan.code,
      amount: plan.price_monthly,
      metadata: { onboarding: true },
      created_at: nowIso,
    });

    appendAuditLog(db, {
      tenant_id: tenantId,
      actor_profile_id: profileId,
      actor_email: params.email,
      actor_role: 'OWNER',
      action: 'TENANT_REGISTERED',
      entity: 'tenants',
      entity_id: tenantId,
      severity: 'info',
      details: { slug: params.slug, planCode: plan.code },
    });

    return { ok: true, tenantId, profileId, slug: params.slug.trim().toLowerCase() };
  });
}

export async function enqueueAndMaybeSendNotification(
  db: DatabaseState,
  params: {
    tenantId: string;
    triggerEvent: NotificationTrigger;
    customer?: Customer;
    appointment?: Appointment;
    variables: Record<string, string>;
  }
): Promise<NotificationJob | null> {
  const tpl = db.notification_templates.find(
    (t) => t.tenant_id === params.tenantId && t.trigger_event === params.triggerEvent
  );
  if (!tpl || !tpl.is_active) return null;

  const message = renderNotificationTemplate(tpl.body_template, params.variables);
  const nowIso = new Date().toISOString();
  const recipient = params.customer?.phone || params.customer?.email || '';
  if (!recipient) return null;

  if (params.customer && !params.customer.whatsapp_opt_in && tpl.channel === 'whatsapp') {
    const optedOutJob: NotificationJob = {
      id: uid('njob'),
      tenant_id: params.tenantId,
      customer_id: params.customer.id,
      appointment_id: params.appointment?.id ?? null,
      trigger_event: params.triggerEvent,
      channel: 'whatsapp',
      recipient,
      rendered_message: message,
      status: 'opted_out',
      attempts: 0,
      max_attempts: 3,
      scheduled_for: nowIso,
      last_error: 'Cliente optou por não receber mensagens (LGPD opt-out).',
      created_at: nowIso,
    };
    db.notification_jobs.unshift(optedOutJob);
    return optedOutJob;
  }

  const channel: 'whatsapp' | 'email' = tpl.channel === 'email' ? 'email' : 'whatsapp';
  const result =
    channel === 'whatsapp'
      ? await dispatchWhatsAppMessage({ toPhone: recipient, message })
      : await dispatchTransactionalEmail({
          to: params.customer?.email || recipient,
          subject: tpl.title,
          html: `<p>${message}</p>`,
        });

  const job: NotificationJob = {
    id: uid('njob'),
    tenant_id: params.tenantId,
    customer_id: params.customer?.id ?? null,
    appointment_id: params.appointment?.id ?? null,
    trigger_event: params.triggerEvent,
    channel,
    recipient,
    rendered_message: message,
    status: result.status,
    attempts: 1,
    max_attempts: 3,
    scheduled_for: nowIso,
    last_error: result.error ?? null,
    created_at: nowIso,
  };
  db.notification_jobs.unshift(job);

  db.notification_logs.unshift({
    id: uid('nlog'),
    tenant_id: params.tenantId,
    job_id: job.id,
    provider: channel === 'whatsapp' ? 'whatsapp_cloud_api' : 'resend',
    provider_message_id: result.providerMessageId ?? null,
    status: result.status,
    response_payload: result.payload,
    created_at: nowIso,
  });

  return job;
}

/**
 * Cria um agendamento no servidor dentro de mutex transacional (`mutateDb`)
 * validando limites do plano, disponibilidade real, conflitos simultâneos (race condition),
 * cálculo de cupom, cliente, eventos e enfileiramento de notificação.
 */
export async function createAppointmentTransactional(params: {
  tenantId: string;
  branchId: string;
  barberId?: string | null;
  serviceIds: string[];
  startsAt: string;
  customerName: string;
  customerPhone: string;
  customerEmail?: string;
  paymentMethod?: Payment['method'];
  paymentTiming?: 'now' | 'deposit' | 'on_arrival';
  couponCode?: string | null;
  notes?: string;
  isRecurring?: boolean;
  recurrenceRule?: string | null;
  source?: Appointment['source'];
  lgpdConsent?: boolean;
  whatsappOptIn?: boolean;
  actorProfileId?: string | null;
}): Promise<{
  ok: boolean;
  statusCode?: number;
  error?: string;
  limitDetails?: ReturnType<typeof checkMonthlyAppointmentLimit>;
  appointment?: Appointment;
  barber?: Barber;
  customer?: Customer;
}> {
  return mutateDb(async (db) => {
    const tenant = db.tenants.find((t) => t.id === params.tenantId && !t.deleted_at);
    if (!tenant) return { ok: false, statusCode: 404, error: 'Barbearia não encontrada.' };

    if (tenant.status === 'suspended') {
      return { ok: false, statusCode: 403, error: 'Esta barbearia está temporariamente suspensa.' };
    }

    const branch = db.branches.find(
      (b) => b.id === params.branchId && b.tenant_id === params.tenantId && !b.deleted_at
    );
    if (!branch) return { ok: false, statusCode: 404, error: 'Unidade/filial não encontrada.' };

    // Verificar limite mensal de agendamentos do plano SaaS
    const limitCheck = checkMonthlyAppointmentLimit({
      tenantId: params.tenantId,
      referenceDate: new Date(params.startsAt),
      appointments: db.appointments,
      subscriptions: db.subscriptions,
      plans: db.subscription_plans,
    });
    if (!limitCheck.allowed) {
      return {
        ok: false,
        statusCode: 402,
        error: limitCheck.message,
        limitDetails: limitCheck,
      };
    }

    // Selecionar ou recomendar barbeiro disponível
    const candidateBarbers = db.barbers.filter(
      (b) =>
        b.tenant_id === params.tenantId &&
        b.branch_id === params.branchId &&
        b.is_active &&
        !b.deleted_at &&
        (!params.barberId || b.id === params.barberId)
    );

    if (candidateBarbers.length === 0) {
      return {
        ok: false,
        statusCode: 400,
        error: 'Nenhum profissional ativo disponível nesta unidade.',
      };
    }

    const { selectedServices, totalDurationMinutes, totalBufferMinutes, subtotalAmount } =
      computeServicesDurationAndPrice({
        serviceIds: params.serviceIds,
        barberId: params.barberId ?? candidateBarbers[0].id,
        services: db.services.filter((s) => s.tenant_id === params.tenantId),
        barberServices: db.barber_services,
      });

    if (selectedServices.length === 0) {
      return { ok: false, statusCode: 400, error: 'Selecione ao menos um serviço válido.' };
    }

    const blockDuration = totalDurationMinutes + totalBufferMinutes;

    let selectedBarber: Barber | null = null;
    let endsAtIso = '';
    let conflictReason = 'Horário indisponível.';

    for (const candidate of candidateBarbers) {
      const check = checkBarberSlotAvailability({
        barber: candidate,
        startsAtIso: params.startsAt,
        durationMinutes: blockDuration,
        workingHours: db.working_hours,
        blockedTimes: db.blocked_times,
        appointments: db.appointments,
        timezone: branch.timezone,
      });
      if (check.available) {
        selectedBarber = candidate;
        endsAtIso = check.endsAtIso;
        break;
      } else if (check.reason) {
        conflictReason = check.reason;
      }
    }

    if (!selectedBarber) {
      return {
        ok: false,
        statusCode: 409,
        error: conflictReason,
      };
    }

    // Aplicar cupom de desconto do tenant se informado
    let discountAmount = 0;
    let appliedCouponCode: string | null = null;
    if (params.couponCode) {
      const coupon = db.coupons.find(
        (c) =>
          c.scope === 'tenant' &&
          c.tenant_id === params.tenantId &&
          c.is_active &&
          c.code.toUpperCase() === params.couponCode!.trim().toUpperCase()
      );
      if (coupon && (!coupon.max_uses || coupon.used_count < coupon.max_uses)) {
        discountAmount =
          coupon.discount_type === 'percentage'
            ? Number(((subtotalAmount * coupon.discount_value) / 100).toFixed(2))
            : Math.min(subtotalAmount, coupon.discount_value);
        coupon.used_count += 1;
        appliedCouponCode = coupon.code;
      }
    }

    const totalAmount = Number(Math.max(0, subtotalAmount - discountAmount).toFixed(2));
    const settings = db.tenant_settings.find((s) => s.tenant_id === params.tenantId);
    const depositAmount =
      params.paymentTiming === 'deposit' || settings?.require_deposit
        ? Number(((totalAmount * (settings?.deposit_percentage || 30)) / 100).toFixed(2))
        : 0;

    // Localizar ou criar cliente isolado no tenant
    const nowIso = new Date().toISOString();
    const cleanPhone = params.customerPhone.replace(/\D/g, '');
    let customer = db.customers.find(
      (c) =>
        c.tenant_id === params.tenantId &&
        !c.deleted_at &&
        (c.phone.replace(/\D/g, '') === cleanPhone ||
          (params.customerEmail && c.email?.toLowerCase() === params.customerEmail.toLowerCase()))
    );

    if (!customer) {
      customer = {
        id: uid('cust'),
        tenant_id: params.tenantId,
        branch_id: params.branchId,
        full_name: params.customerName.trim(),
        phone: params.customerPhone.trim(),
        email: params.customerEmail || undefined,
        preferred_barber_id: selectedBarber.id,
        total_spent: 0,
        visits_count: 0,
        no_show_count: 0,
        cancelled_count: 0,
        marketing_opt_in: params.whatsappOptIn ?? true,
        whatsapp_opt_in: params.whatsappOptIn ?? true,
        lgpd_consent_at: params.lgpdConsent !== false ? nowIso : null,
        created_at: nowIso,
      };
      db.customers.push(customer);

      db.loyalty_accounts.push({
        id: uid('loy'),
        tenant_id: params.tenantId,
        customer_id: customer.id,
        points_balance: 0,
        stamps_balance: 0,
        cashback_balance: 0,
        referral_code: `${params.customerName.slice(0, 4).toUpperCase()}-${Math.floor(1000 + Math.random() * 9000)}`,
        updated_at: nowIso,
      });
    }

    const appointmentId = uid('appt');
    const appointment: Appointment = {
      id: appointmentId,
      tenant_id: params.tenantId,
      branch_id: params.branchId,
      barber_id: selectedBarber.id,
      customer_id: customer.id,
      starts_at: params.startsAt,
      ends_at: endsAtIso,
      status: settings?.booking_auto_confirm !== false ? 'confirmed' : 'pending',
      source: params.source ?? 'online',
      is_recurring: Boolean(params.isRecurring),
      recurrence_rule: params.recurrenceRule ?? null,
      total_duration_minutes: totalDurationMinutes,
      subtotal_amount: subtotalAmount,
      discount_amount: discountAmount,
      total_amount: totalAmount,
      deposit_amount: depositAmount,
      coupon_code: appliedCouponCode,
      notes: params.notes,
      created_at: nowIso,
      updated_at: nowIso,
    };

    db.appointments.push(appointment);

    for (const svc of selectedServices) {
      db.appointment_services.push({
        id: uid('as'),
        tenant_id: params.tenantId,
        appointment_id: appointmentId,
        service_id: svc.id,
        service_name: svc.name,
        duration_minutes: svc.duration_minutes,
        buffer_minutes: svc.buffer_minutes,
        price: svc.price,
      });
    }

    db.appointment_events.push({
      id: uid('evt'),
      tenant_id: params.tenantId,
      appointment_id: appointmentId,
      actor_profile_id: params.actorProfileId ?? null,
      event_type: 'created',
      payload: {
        source: appointment.source,
        barberId: selectedBarber.id,
        totalAmount,
      },
      created_at: nowIso,
    });

    const zoned = getZonedDateParts(appointment.starts_at, branch.timezone);
    await enqueueAndMaybeSendNotification(db, {
      tenantId: params.tenantId,
      triggerEvent: 'appointment_confirmed',
      customer,
      appointment,
      variables: {
        cliente: customer.full_name,
        barbeiro: selectedBarber.name,
        servico: selectedServices.map((s) => s.name).join(' + '),
        data: zoned.dateStr.split('-').reverse().join('/'),
        hora: zoned.timeStr,
        barbearia: tenant.name,
        link: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/s/${tenant.slug}`,
      },
    });

    appendAuditLog(db, {
      tenant_id: params.tenantId,
      actor_profile_id: params.actorProfileId ?? null,
      action: 'APPOINTMENT_CREATED',
      entity: 'appointments',
      entity_id: appointmentId,
      severity: 'info',
      details: {
        barberId: selectedBarber.id,
        startsAt: appointment.starts_at,
        totalAmount,
      },
    });

    return { ok: true, statusCode: 201, appointment, barber: selectedBarber, customer };
  });
}

/**
 * Executa ações de ciclo de vida do agendamento (confirm, start, complete, cancel, no_show, reschedule)
 * gerando comissões imutáveis, baixa automática de estoque, pontos/fidelidade e lista de espera.
 */
export async function applyAppointmentAction(params: {
  tenantId: string;
  appointmentId: string;
  action: 'confirm' | 'start' | 'complete' | 'cancel' | 'no_show' | 'reschedule';
  actorProfileId?: string | null;
  actorRole?: RoleCode;
  newStartsAt?: string;
  newBarberId?: string;
  reason?: string;
  paymentMethod?: Payment['method'];
  amountPaid?: number;
}): Promise<{
  ok: boolean;
  statusCode?: number;
  error?: string;
  appointment?: Appointment;
  generatedCommissions?: Commission[];
  notifiedWaitlistCount?: number;
}> {
  return mutateDb(async (db) => {
    const appt = db.appointments.find(
      (a) => a.id === params.appointmentId && a.tenant_id === params.tenantId && !a.deleted_at
    );
    if (!appt) {
      return { ok: false, statusCode: 404, error: 'Agendamento não encontrado neste tenant.' };
    }

    const nowIso = new Date().toISOString();
    const tenant = db.tenants.find((t) => t.id === params.tenantId)!;
    const branch = db.branches.find((b) => b.id === appt.branch_id)!;
    const customer = db.customers.find((c) => c.id === appt.customer_id);
    const barber = db.barbers.find((b) => b.id === appt.barber_id)!;
    const apptServices = db.appointment_services.filter((s) => s.appointment_id === appt.id);

    if (params.action === 'confirm') {
      appt.status = 'confirmed';
      appt.updated_at = nowIso;
      db.appointment_events.push({
        id: uid('evt'),
        tenant_id: params.tenantId,
        appointment_id: appt.id,
        actor_profile_id: params.actorProfileId ?? null,
        event_type: 'confirmed',
        payload: {},
        created_at: nowIso,
      });
      return { ok: true, appointment: appt };
    }

    if (params.action === 'start') {
      appt.status = 'in_progress';
      appt.updated_at = nowIso;
      db.appointment_events.push({
        id: uid('evt'),
        tenant_id: params.tenantId,
        appointment_id: appt.id,
        actor_profile_id: params.actorProfileId ?? null,
        event_type: 'started',
        payload: {},
        created_at: nowIso,
      });
      return { ok: true, appointment: appt };
    }

    if (params.action === 'reschedule') {
      if (!params.newStartsAt) {
        return { ok: false, statusCode: 400, error: 'Informe a nova data e horário para remarcar.' };
      }
      const targetBarber = params.newBarberId
        ? db.barbers.find((b) => b.id === params.newBarberId && b.tenant_id === params.tenantId)
        : barber;
      if (!targetBarber) {
        return { ok: false, statusCode: 404, error: 'Profissional de destino não encontrado.' };
      }

      const bufferTotal = apptServices.reduce((acc, s) => acc + s.buffer_minutes, 0);
      const check = checkBarberSlotAvailability({
        barber: targetBarber,
        startsAtIso: params.newStartsAt,
        durationMinutes: appt.total_duration_minutes + bufferTotal,
        workingHours: db.working_hours,
        blockedTimes: db.blocked_times,
        appointments: db.appointments,
        ignoreAppointmentId: appt.id,
        timezone: branch.timezone,
      });

      if (!check.available) {
        return { ok: false, statusCode: 409, error: check.reason };
      }

      const oldStartsAt = appt.starts_at;
      appt.barber_id = targetBarber.id;
      appt.starts_at = params.newStartsAt;
      appt.ends_at = check.endsAtIso;
      appt.status = 'confirmed';
      appt.updated_at = nowIso;

      db.appointment_events.push({
        id: uid('evt'),
        tenant_id: params.tenantId,
        appointment_id: appt.id,
        actor_profile_id: params.actorProfileId ?? null,
        event_type: 'rescheduled',
        payload: { from: oldStartsAt, to: params.newStartsAt, barberId: targetBarber.id },
        created_at: nowIso,
      });

      if (customer) {
        const zoned = getZonedDateParts(appt.starts_at, branch.timezone);
        await enqueueAndMaybeSendNotification(db, {
          tenantId: params.tenantId,
          triggerEvent: 'appointment_rescheduled',
          customer,
          appointment: appt,
          variables: {
            cliente: customer.full_name,
            barbeiro: targetBarber.name,
            servico: apptServices.map((s) => s.service_name).join(' + '),
            data: zoned.dateStr.split('-').reverse().join('/'),
            hora: zoned.timeStr,
            barbearia: tenant.name,
            link: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/s/${tenant.slug}`,
          },
        });
      }

      return { ok: true, appointment: appt };
    }

    if (params.action === 'cancel') {
      // Verifica política de cancelamento para perfil CUSTOMER
      const settings = db.tenant_settings.find((s) => s.tenant_id === params.tenantId);
      if (params.actorRole === 'CUSTOMER' && settings) {
        const hoursUntil = (new Date(appt.starts_at).getTime() - Date.now()) / (1000 * 60 * 60);
        if (hoursUntil < settings.cancellation_policy_hours) {
          return {
            ok: false,
            statusCode: 400,
            error: `Cancelamento permitido pelo cliente com no mínimo ${settings.cancellation_policy_hours}h de antecedência. Entre em contato com a recepção.`,
          };
        }
      }

      appt.status = 'cancelled';
      appt.cancellation_reason = params.reason || 'Cancelado pelo operador/cliente';
      appt.cancelled_at = nowIso;
      appt.updated_at = nowIso;

      if (customer) {
        customer.cancelled_count += 1;
      }

      db.appointment_events.push({
        id: uid('evt'),
        tenant_id: params.tenantId,
        appointment_id: appt.id,
        actor_profile_id: params.actorProfileId ?? null,
        event_type: 'cancelled',
        payload: { reason: appt.cancellation_reason },
        created_at: nowIso,
      });

      // Lista de espera automática: notifica interessados compatíveis com a data liberada!
      const freedDate = getZonedDateParts(appt.starts_at, branch.timezone);
      const matchingWaitlist = db.waitlist_entries.filter(
        (w) =>
          w.tenant_id === params.tenantId &&
          w.branch_id === appt.branch_id &&
          w.status === 'waiting' &&
          w.desired_date === freedDate.dateStr &&
          (!w.barber_id || w.barber_id === appt.barber_id)
      );

      let notifiedCount = 0;
      for (const entry of matchingWaitlist) {
        const waitCustomer = db.customers.find((c) => c.id === entry.customer_id);
        entry.status = 'notified';
        entry.notified_at = nowIso;
        notifiedCount += 1;
        if (waitCustomer) {
          await enqueueAndMaybeSendNotification(db, {
            tenantId: params.tenantId,
            triggerEvent: 'waitlist_slot_available',
            customer: waitCustomer,
            appointment: appt,
            variables: {
              cliente: waitCustomer.full_name,
              barbeiro: barber.name,
              data: freedDate.dateStr.split('-').reverse().join('/'),
              hora: freedDate.timeStr,
              barbearia: tenant.name,
              link: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/s/${tenant.slug}`,
            },
          });
        }
      }

      return { ok: true, appointment: appt, notifiedWaitlistCount: notifiedCount };
    }

    if (params.action === 'no_show') {
      appt.status = 'no_show';
      appt.updated_at = nowIso;
      if (customer) {
        customer.no_show_count += 1;
      }
      db.appointment_events.push({
        id: uid('evt'),
        tenant_id: params.tenantId,
        appointment_id: appt.id,
        actor_profile_id: params.actorProfileId ?? null,
        event_type: 'no_show',
        payload: {},
        created_at: nowIso,
      });
      return { ok: true, appointment: appt };
    }

    // COMPLETE: Marca concluído, gera pagamento presencial se informado, snapshot de comissões, baixa estoque e fidelidade
    appt.status = 'completed';
    appt.completed_at = nowIso;
    appt.updated_at = nowIso;

    if (customer) {
      customer.visits_count += 1;
      customer.total_spent = Number((customer.total_spent + appt.total_amount).toFixed(2));
      customer.last_visit_at = nowIso;

      // Programa de fidelidade & cashback
      const settings = db.tenant_settings.find((s) => s.tenant_id === params.tenantId);
      let loyalty = db.loyalty_accounts.find(
        (l) => l.tenant_id === params.tenantId && l.customer_id === customer.id
      );
      if (!loyalty) {
        loyalty = {
          id: uid('loy'),
          tenant_id: params.tenantId,
          customer_id: customer.id,
          points_balance: 0,
          stamps_balance: 0,
          cashback_balance: 0,
          referral_code: `${customer.full_name.slice(0, 4).toUpperCase()}-VIP`,
          updated_at: nowIso,
        };
        db.loyalty_accounts.push(loyalty);
      }
      const pointsEarned = Math.round(appt.total_amount);
      const cashbackEarned = Number(
        ((appt.total_amount * (settings?.cashback_percent ?? 5)) / 100).toFixed(2)
      );
      loyalty.points_balance += pointsEarned;
      loyalty.stamps_balance += 1;
      loyalty.cashback_balance = Number((loyalty.cashback_balance + cashbackEarned).toFixed(2));
      loyalty.updated_at = nowIso;

      db.loyalty_transactions.push({
        id: uid('ltx'),
        tenant_id: params.tenantId,
        loyalty_account_id: loyalty.id,
        transaction_type: 'earn_stamp',
        points_delta: pointsEarned,
        stamps_delta: 1,
        cashback_delta: cashbackEarned,
        description: `Conclusão de ${apptServices.map((s) => s.service_name).join(' + ')}`,
        created_at: nowIso,
      });
    }

    // Registrar pagamento presencial se nenhum pagamento aprovado ainda cobrir o total
    const alreadyPaid = db.payments
      .filter((p) => p.appointment_id === appt.id && p.status === 'approved')
      .reduce((acc, p) => acc + p.gross_amount, 0);

    const remaining = Number(Math.max(0, appt.total_amount - alreadyPaid).toFixed(2));
    if (params.paymentMethod && remaining > 0) {
      const amountToRegister = params.amountPaid ?? remaining;
      const payId = uid('pay');
      const payment: Payment = {
        id: payId,
        tenant_id: params.tenantId,
        branch_id: appt.branch_id,
        appointment_id: appt.id,
        customer_id: appt.customer_id,
        provider: 'manual',
        method: params.paymentMethod,
        payment_type: alreadyPaid > 0 ? 'remaining' : 'full',
        gross_amount: amountToRegister,
        provider_fee: 0,
        refunded_amount: 0,
        net_amount: amountToRegister,
        status: 'approved',
        paid_at: nowIso,
        created_at: nowIso,
      };
      db.payments.push(payment);

      const openRegister = db.cash_registers.find(
        (r) => r.tenant_id === params.tenantId && r.branch_id === appt.branch_id && r.status === 'open'
      );
      if (openRegister) {
        const tx: CashTransaction = {
          id: uid('ctx'),
          tenant_id: params.tenantId,
          branch_id: appt.branch_id,
          cash_register_id: openRegister.id,
          payment_id: payId,
          transaction_type: 'income',
          method: params.paymentMethod,
          amount: amountToRegister,
          description: `Atendimento #${appt.id.slice(-6)} — ${customer?.full_name || 'Cliente'}`,
          created_by: params.actorProfileId ?? null,
          created_at: nowIso,
        };
        db.cash_transactions.push(tx);
        openRegister.expected_closing_balance = Number(
          (openRegister.expected_closing_balance + amountToRegister).toFixed(2)
        );
      }
    }

    // Gerar comissões preservando snapshot das regras atuais (apenas se não houver comissão prévia)
    const alreadyHasCommission = db.commissions.some(
      (c) => c.appointment_id === appt.id && c.status !== 'cancelled'
    );
    let generatedCommissions: Commission[] = [];
    if (!alreadyHasCommission) {
      const existingMonthlyRev = db.appointments
        .filter(
          (a) =>
            a.tenant_id === params.tenantId &&
            a.barber_id === barber.id &&
            a.status === 'completed' &&
            a.id !== appt.id
        )
        .reduce((acc, a) => acc + a.total_amount, 0);

      generatedCommissions = buildCommissionRecords({
        idFactory: () => uid('comm'),
        appointment: appt,
        appointmentServices: apptServices,
        barber,
        rules: db.commission_rules,
        existingBarberCompletedMonthlyRevenue: existingMonthlyRev,
        nowIso,
      });
      db.commissions.push(...generatedCommissions);
    }

    // Baixa automática de estoque vinculada aos serviços executados
    for (const svc of apptServices) {
      const consumptions = db.service_product_consumptions.filter(
        (c) => c.tenant_id === params.tenantId && c.service_id === svc.service_id
      );
      for (const cons of consumptions) {
        const product = db.products.find(
          (p) => p.id === cons.product_id && p.branch_id === appt.branch_id
        );
        if (product) {
          product.stock_quantity = Math.max(0, product.stock_quantity - cons.quantity_used);
          db.inventory_movements.unshift({
            id: uid('inv'),
            tenant_id: params.tenantId,
            branch_id: appt.branch_id,
            product_id: product.id,
            movement_type: 'service_consumption',
            quantity: cons.quantity_used,
            unit_cost: product.cost_price,
            reference_id: appt.id,
            reason: `Consumo automático: ${svc.service_name}`,
            created_by: params.actorProfileId ?? null,
            created_at: nowIso,
          });
        }
      }
    }

    db.appointment_events.push({
      id: uid('evt'),
      tenant_id: params.tenantId,
      appointment_id: appt.id,
      actor_profile_id: params.actorProfileId ?? null,
      event_type: 'completed',
      payload: {
        commissionsCount: generatedCommissions.length,
      },
      created_at: nowIso,
    });

    if (customer) {
      await enqueueAndMaybeSendNotification(db, {
        tenantId: params.tenantId,
        triggerEvent: 'review_request',
        customer,
        appointment: appt,
        variables: {
          cliente: customer.full_name,
          barbeiro: barber.name,
          barbearia: tenant.name,
          link: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/s/${tenant.slug}?review=${appt.id}`,
        },
      });
    }

    return { ok: true, appointment: appt, generatedCommissions };
  });
}

export async function addBarberWithPlanGuard(params: {
  tenantId: string;
  branchId: string;
  name: string;
  specialty: string;
  bio?: string;
  phone?: string;
  email?: string;
  defaultCommissionPercent: number;
  monthlyRevenueGoal: number;
  avatarUrl?: string;
  actorProfileId?: string | null;
}): Promise<{
  ok: boolean;
  statusCode?: number;
  error?: string;
  limitDetails?: ReturnType<typeof checkBarberCreationLimit>;
  barber?: Barber;
}> {
  return mutateDb((db) => {
    const check = checkBarberCreationLimit({
      tenantId: params.tenantId,
      barbers: db.barbers,
      subscriptions: db.subscriptions,
      plans: db.subscription_plans,
    });

    if (!check.allowed) {
      return {
        ok: false,
        statusCode: 402,
        error: check.message,
        limitDetails: check,
      };
    }

    const nowIso = new Date().toISOString();
    const barber: Barber = {
      id: uid('barber'),
      tenant_id: params.tenantId,
      branch_id: params.branchId,
      name: params.name.trim(),
      specialty: params.specialty.trim(),
      bio: params.bio,
      avatar_url: params.avatarUrl || '/assets/barbers/barber-matheus.jpg',
      phone: params.phone,
      email: params.email,
      rating_avg: 5.0,
      reviews_count: 0,
      monthly_revenue_goal: params.monthlyRevenueGoal,
      default_commission_percent: params.defaultCommissionPercent,
      is_active: true,
      created_at: nowIso,
    };

    db.barbers.push(barber);

    for (let dow = 0; dow <= 6; dow++) {
      db.working_hours.push({
        id: uid('wh'),
        tenant_id: params.tenantId,
        branch_id: params.branchId,
        barber_id: barber.id,
        day_of_week: dow,
        start_time: '09:00',
        end_time: '20:00',
        break_start: '12:00',
        break_end: '13:00',
        is_day_off: dow === 0,
      });
    }

    appendAuditLog(db, {
      tenant_id: params.tenantId,
      actor_profile_id: params.actorProfileId ?? null,
      action: 'BARBER_CREATED',
      entity: 'barbers',
      entity_id: barber.id,
      severity: 'info',
      details: { name: barber.name, branchId: barber.branch_id },
    });

    return { ok: true, statusCode: 201, barber };
  });
}

export async function addBranchWithPlanGuard(params: {
  tenantId: string;
  name: string;
  address: string;
  city: string;
  state: string;
  phone: string;
  timezone?: string;
  openingHoursLabel?: string;
  actorProfileId?: string | null;
}): Promise<{
  ok: boolean;
  statusCode?: number;
  error?: string;
  limitDetails?: ReturnType<typeof checkBranchCreationLimit>;
  branch?: Branch;
}> {
  return mutateDb((db) => {
    const check = checkBranchCreationLimit({
      tenantId: params.tenantId,
      branches: db.branches,
      subscriptions: db.subscriptions,
      plans: db.subscription_plans,
    });

    if (!check.allowed) {
      return { ok: false, statusCode: 402, error: check.message, limitDetails: check };
    }

    const nowIso = new Date().toISOString();
    const slug = params.name
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');

    const branch: Branch = {
      id: uid('branch'),
      tenant_id: params.tenantId,
      name: params.name.trim(),
      slug: slug || `filial-${Date.now()}`,
      address: params.address,
      city: params.city,
      state: params.state.toUpperCase(),
      phone: params.phone,
      timezone: params.timezone || 'America/Sao_Paulo',
      opening_hours_label: params.openingHoursLabel || 'SEG - SÁB: 09h às 20h',
      is_headquarters: false,
      is_active: true,
      created_at: nowIso,
      deleted_at: null,
    };

    db.branches.push(branch);
    appendAuditLog(db, {
      tenant_id: params.tenantId,
      actor_profile_id: params.actorProfileId ?? null,
      action: 'BRANCH_CREATED',
      entity: 'branches',
      entity_id: branch.id,
      severity: 'info',
      details: { name: branch.name },
    });

    return { ok: true, statusCode: 201, branch };
  });
}

export async function getTenantUsageSummary(tenantId: string) {
  const db = await readDb();
  const { subscription, plan } = getTenantActivePlan({
    tenantId,
    subscriptions: db.subscriptions,
    plans: db.subscription_plans,
  });
  const now = new Date();
  const barbersUsed = db.barbers.filter(
    (b) => b.tenant_id === tenantId && b.is_active && !b.deleted_at
  ).length;
  const branchesUsed = db.branches.filter(
    (b) => b.tenant_id === tenantId && b.is_active && !b.deleted_at
  ).length;
  const appointmentsMonthUsed = db.appointments.filter((a) => {
    if (a.tenant_id !== tenantId || a.deleted_at || a.status === 'cancelled') return false;
    const d = new Date(a.starts_at);
    return d.getUTCFullYear() === now.getUTCFullYear() && d.getUTCMonth() === now.getUTCMonth();
  }).length;

  return {
    subscription,
    plan,
    barbersUsed,
    branchesUsed,
    appointmentsMonthUsed,
  };
}
