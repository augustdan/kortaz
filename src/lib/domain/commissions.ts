import type {
  Appointment,
  AppointmentService,
  Barber,
  Commission,
  CommissionRule,
} from '@/lib/types/domain';

export interface CalculatedCommissionLine {
  referenceLabel: string;
  sourceType: 'service' | 'product' | 'goal_bonus' | 'adjustment';
  grossBaseAmount: number;
  appliedRuleType: 'percentage' | 'fixed';
  appliedRuleValue: number;
  commissionAmount: number;
}

/**
 * Calcula as linhas de comissão aplicando precedência:
 * 1. Regra específica barbeiro + serviço (`barber_service`)
 * 2. Regra global do serviço (`service_global`)
 * 3. Regra padrão do barbeiro (`barber_default` nas regras ou `barber.default_commission_percent`)
 * Preserva o snapshot exato no momento da realização do serviço.
 */
export function calculateAppointmentCommissions(params: {
  appointment: Appointment;
  appointmentServices: AppointmentService[];
  barber: Barber;
  rules: CommissionRule[];
  existingBarberCompletedMonthlyRevenue?: number;
}): CalculatedCommissionLine[] {
  const { appointment, appointmentServices, barber, rules, existingBarberCompletedMonthlyRevenue = 0 } = params;
  const lines: CalculatedCommissionLine[] = [];

  const activeRules = rules.filter((r) => r.tenant_id === appointment.tenant_id && r.is_active);
  const discountRatio =
    appointment.subtotal_amount > 0
      ? Math.max(0, appointment.total_amount / appointment.subtotal_amount)
      : 1;

  for (const item of appointmentServices) {
    const netItemGross = Number((item.price * discountRatio).toFixed(2));

    const barberServiceRule = activeRules.find(
      (r) =>
        r.rule_scope === 'barber_service' &&
        r.barber_id === barber.id &&
        r.service_id === item.service_id
    );
    const serviceGlobalRule = activeRules.find(
      (r) => r.rule_scope === 'service_global' && r.service_id === item.service_id
    );
    const barberDefaultRule = activeRules.find(
      (r) => r.rule_scope === 'barber_default' && r.barber_id === barber.id
    );

    const chosenRule = barberServiceRule ?? serviceGlobalRule ?? barberDefaultRule;
    const ruleType: 'percentage' | 'fixed' = chosenRule?.commission_type ?? 'percentage';
    const ruleValue = chosenRule?.value ?? barber.default_commission_percent;

    const amount =
      ruleType === 'percentage'
        ? Number(((netItemGross * ruleValue) / 100).toFixed(2))
        : Number(Math.min(netItemGross, ruleValue).toFixed(2));

    lines.push({
      referenceLabel: item.service_name,
      sourceType: 'service',
      grossBaseAmount: netItemGross,
      appliedRuleType: ruleType,
      appliedRuleValue: ruleValue,
      commissionAmount: amount,
    });
  }

  // Verificar bônus por meta atingida neste atendimento
  const goalRule = activeRules.find(
    (r) =>
      r.rule_scope === 'goal_bonus' &&
      (!r.barber_id || r.barber_id === barber.id) &&
      typeof r.goal_threshold === 'number' &&
      typeof r.bonus_amount === 'number'
  );

  if (goalRule && goalRule.goal_threshold && goalRule.bonus_amount) {
    const previousTotal = existingBarberCompletedMonthlyRevenue;
    const newTotal = previousTotal + appointment.total_amount;
    if (previousTotal < goalRule.goal_threshold && newTotal >= goalRule.goal_threshold) {
      lines.push({
        referenceLabel: `Bônus por meta mensal (R$ ${goalRule.goal_threshold.toFixed(2)})`,
        sourceType: 'goal_bonus',
        grossBaseAmount: newTotal,
        appliedRuleType: 'fixed',
        appliedRuleValue: goalRule.bonus_amount,
        commissionAmount: Number(goalRule.bonus_amount.toFixed(2)),
      });
    }
  }

  return lines;
}

export function buildCommissionRecords(params: {
  idFactory: () => string;
  appointment: Appointment;
  appointmentServices: AppointmentService[];
  barber: Barber;
  rules: CommissionRule[];
  existingBarberCompletedMonthlyRevenue?: number;
  nowIso: string;
}): Commission[] {
  const lines = calculateAppointmentCommissions(params);

  return lines.map((line) => ({
    id: params.idFactory(),
    tenant_id: params.appointment.tenant_id,
    branch_id: params.appointment.branch_id,
    barber_id: params.barber.id,
    appointment_id: params.appointment.id,
    reference_label: line.referenceLabel,
    source_type: line.sourceType,
    gross_base_amount: line.grossBaseAmount,
    applied_rule_type: line.appliedRuleType,
    applied_rule_value: line.appliedRuleValue,
    commission_amount: line.commissionAmount,
    adjustment_amount: 0,
    adjustment_reason: null,
    final_amount: line.commissionAmount,
    status: 'pending',
    paid_at: null,
    created_at: params.nowIso,
  }));
}
