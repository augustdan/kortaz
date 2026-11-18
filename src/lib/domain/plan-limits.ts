import type {
  Appointment,
  Barber,
  Branch,
  PlanCode,
  Subscription,
  SubscriptionFeature,
  SubscriptionPlan,
} from '@/lib/types/domain';

export interface PlanLimitCheckResult {
  allowed: boolean;
  limitType?: 'barbers' | 'monthly_appointments' | 'branches' | 'feature' | 'subscription_inactive';
  currentUsage?: number;
  maxAllowed?: number | null;
  planName: string;
  planCode: PlanCode;
  message?: string;
  alternatives?: string[];
}

export function getTenantActivePlan(params: {
  tenantId: string;
  subscriptions: Subscription[];
  plans: SubscriptionPlan[];
}): { subscription: Subscription | null; plan: SubscriptionPlan } {
  const sub = params.subscriptions.find((s) => s.tenant_id === params.tenantId) ?? null;
  const plan =
    (sub ? params.plans.find((p) => p.id === sub.plan_id) : null) ??
    params.plans.find((p) => p.code === 'free') ??
    params.plans[0];
  return { subscription: sub, plan };
}

export function checkBarberCreationLimit(params: {
  tenantId: string;
  barbers: Barber[];
  subscriptions: Subscription[];
  plans: SubscriptionPlan[];
}): PlanLimitCheckResult {
  const { subscription, plan } = getTenantActivePlan(params);
  if (subscription && (subscription.status === 'suspended' || subscription.status === 'cancelled')) {
    return {
      allowed: false,
      limitType: 'subscription_inactive',
      planName: plan.name,
      planCode: plan.code,
      message: `Assinatura ${subscription.status === 'suspended' ? 'suspensa' : 'cancelada'}. Regularize em Assinatura para cadastrar novos profissionais. Seus dados continuam preservados.`,
      alternatives: ['Reativar assinatura na aba Assinatura', 'Entrar em contato com o suporte'],
    };
  }

  const activeBarbers = params.barbers.filter(
    (b) => b.tenant_id === params.tenantId && !b.deleted_at && b.is_active
  ).length;

  if (plan.max_barbers !== null && activeBarbers >= plan.max_barbers) {
    return {
      allowed: false,
      limitType: 'barbers',
      currentUsage: activeBarbers,
      maxAllowed: plan.max_barbers,
      planName: plan.name,
      planCode: plan.code,
      message: `Limite de profissionais atingido no ${plan.name} (${activeBarbers}/${plan.max_barbers} barbeiros ativos). Nenhum dado existente foi alterado ou removido.`,
      alternatives: [
        'Fazer upgrade para o próximo plano e liberar mais barbeiros',
        'Desativar temporariamente um profissional que não esteja atendendo',
      ],
    };
  }

  return {
    allowed: true,
    currentUsage: activeBarbers,
    maxAllowed: plan.max_barbers,
    planName: plan.name,
    planCode: plan.code,
  };
}

export function checkMonthlyAppointmentLimit(params: {
  tenantId: string;
  referenceDate: Date;
  appointments: Appointment[];
  subscriptions: Subscription[];
  plans: SubscriptionPlan[];
}): PlanLimitCheckResult {
  const { subscription, plan } = getTenantActivePlan(params);

  if (subscription && (subscription.status === 'suspended' || subscription.status === 'cancelled')) {
    return {
      allowed: false,
      limitType: 'subscription_inactive',
      planName: plan.name,
      planCode: plan.code,
      message: `Esta barbearia está com a assinatura ${subscription.status}. Os dados históricos permanecem intactos.`,
      alternatives: ['Acessar /app/assinatura para reativar a conta'],
    };
  }

  const month = params.referenceDate.getUTCMonth();
  const year = params.referenceDate.getUTCFullYear();

  const monthlyCount = params.appointments.filter((a) => {
    if (a.tenant_id !== params.tenantId || a.deleted_at) return false;
    if (a.status === 'cancelled') return false;
    const d = new Date(a.starts_at);
    return d.getUTCFullYear() === year && d.getUTCMonth() === month;
  }).length;

  if (plan.max_monthly_appointments !== null && monthlyCount >= plan.max_monthly_appointments) {
    return {
      allowed: false,
      limitType: 'monthly_appointments',
      currentUsage: monthlyCount,
      maxAllowed: plan.max_monthly_appointments,
      planName: plan.name,
      planCode: plan.code,
      message: `Limite mensal de agendamentos atingido no ${plan.name} (${monthlyCount}/${plan.max_monthly_appointments} no mês). Faça upgrade para agendamentos ilimitados sem perder nenhum histórico.`,
      alternatives: [
        'Migrar para o Plano Pro (agendamentos ilimitados)',
        'Aguardar a virada do ciclo mensal mantendo todos os seus registros',
      ],
    };
  }

  return {
    allowed: true,
    currentUsage: monthlyCount,
    maxAllowed: plan.max_monthly_appointments,
    planName: plan.name,
    planCode: plan.code,
  };
}

export function checkBranchCreationLimit(params: {
  tenantId: string;
  branches: Branch[];
  subscriptions: Subscription[];
  plans: SubscriptionPlan[];
}): PlanLimitCheckResult {
  const { plan } = getTenantActivePlan(params);
  const activeBranches = params.branches.filter(
    (b) => b.tenant_id === params.tenantId && !b.deleted_at && b.is_active
  ).length;

  if (activeBranches >= plan.max_branches) {
    return {
      allowed: false,
      limitType: 'branches',
      currentUsage: activeBranches,
      maxAllowed: plan.max_branches,
      planName: plan.name,
      planCode: plan.code,
      message: `Limite de unidades atingido no ${plan.name} (${activeBranches}/${plan.max_branches} unidades). Para gerenciar múltiplas filiais, evolua para o Plano Business ou Enterprise.`,
      alternatives: [
        'Fazer upgrade para o Plano Business (até 3 unidades)',
        'Solicitar Plano Enterprise para unidades ilimitadas',
      ],
    };
  }

  return {
    allowed: true,
    currentUsage: activeBranches,
    maxAllowed: plan.max_branches,
    planName: plan.name,
    planCode: plan.code,
  };
}

export function checkPlanFeatureAccess(params: {
  tenantId: string;
  featureKey: string;
  subscriptions: Subscription[];
  plans: SubscriptionPlan[];
  features: SubscriptionFeature[];
}): PlanLimitCheckResult {
  const { plan } = getTenantActivePlan(params);
  const feature = params.features.find(
    (f) => f.plan_id === plan.id && f.feature_key === params.featureKey
  );

  if (feature && !feature.is_enabled) {
    return {
      allowed: false,
      limitType: 'feature',
      planName: plan.name,
      planCode: plan.code,
      message: `O recurso "${feature.label}" não está incluído no ${plan.name}. Faça upgrade para habilitar imediatamente mantendo todos os seus dados.`,
      alternatives: ['Ver planos compatíveis em /app/assinatura'],
    };
  }

  return {
    allowed: true,
    planName: plan.name,
    planCode: plan.code,
  };
}
