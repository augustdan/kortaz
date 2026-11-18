import type {
  Appointment,
  Barber,
  Branch,
  Customer,
  Service,
  TenantSettings,
} from '@/lib/types/domain';
import { getZonedDateParts } from '@/lib/domain/scheduling';

export type CustomerSegment =
  | 'vip'
  | 'frequent'
  | 'new'
  | 'inactive'
  | 'birthday'
  | 'high_cancel_risk';

export interface CustomerIntelligence {
  customer: Customer;
  segments: CustomerSegment[];
  daysSinceLastVisit: number | null;
  noShowRiskScore: number; // 0..100
  recommendedOffer?: string;
}

export interface BusinessIntelligenceSnapshot {
  realizedRevenueMonth: number;
  projectedAgendaRevenue: number; // Explicitamente marcada como estimativa da agenda futura
  estimatedTotalMonthRevenue: number;
  lowOccupancyHours: { hourLabel: string; occupancyPercent: number; recommendation: string }[];
  serviceProfitability: {
    serviceId: string;
    name: string;
    currentPrice: number;
    estimatedCost: number;
    marginPercent: number;
    bookingsCount: number;
    suggestion: string;
  }[];
  barberProfitability: {
    barberId: string;
    name: string;
    completedCount: number;
    grossRevenue: number;
    goalAmount: number;
    goalProgressPercent: number;
    averageTicket: number;
  }[];
  branchComparison: {
    branchId: string;
    name: string;
    appointmentsCount: number;
    completedRevenue: number;
    attendanceRate: number;
  }[];
  inactiveCustomersForRecovery: CustomerIntelligence[];
  highRiskUpcomingAppointments: {
    appointmentId: string;
    customerName: string;
    startsAt: string;
    noShowCount: number;
    cancelledCount: number;
    recommendation: string;
  }[];
}

export function classifyCustomer(
  customer: Customer,
  settings: TenantSettings | undefined,
  now = new Date()
): CustomerIntelligence {
  const segments: CustomerSegment[] = [];
  const inactiveThreshold = settings?.inactive_days_threshold ?? 45;

  const daysSinceLastVisit = customer.last_visit_at
    ? Math.floor((now.getTime() - new Date(customer.last_visit_at).getTime()) / (1000 * 60 * 60 * 24))
    : null;

  if (customer.total_spent >= 400 || customer.visits_count >= 8) {
    segments.push('vip');
  }
  if (customer.visits_count >= 4) {
    segments.push('frequent');
  }
  if (customer.visits_count <= 1) {
    segments.push('new');
  }
  if (daysSinceLastVisit !== null && daysSinceLastVisit >= inactiveThreshold) {
    segments.push('inactive');
  }

  if (customer.birth_date) {
    const birthMonth = Number(customer.birth_date.split('-')[1]);
    if (birthMonth === now.getMonth() + 1) {
      segments.push('birthday');
    }
  }

  const totalAttempts = Math.max(1, customer.visits_count + customer.no_show_count + customer.cancelled_count);
  const riskRaw = ((customer.no_show_count * 2 + customer.cancelled_count) / totalAttempts) * 100;
  const noShowRiskScore = Math.min(100, Math.round(riskRaw));

  if (customer.no_show_count >= 1 || customer.cancelled_count >= 2 || noShowRiskScore >= 35) {
    segments.push('high_cancel_risk');
  }

  let recommendedOffer: string | undefined;
  if (segments.includes('inactive')) {
    recommendedOffer = `Enviar oferta de retorno (15% OFF ou Combo Corte + Barba) — ${daysSinceLastVisit} dias sem comparecer.`;
  } else if (segments.includes('birthday')) {
    recommendedOffer = 'Enviar mensagem de aniversário com cortesia de acabamento/sobrancelha.';
  }

  return {
    customer,
    segments,
    daysSinceLastVisit,
    noShowRiskScore,
    recommendedOffer,
  };
}

export function buildBusinessIntelligence(params: {
  tenantId: string;
  appointments: Appointment[];
  customers: Customer[];
  barbers: Barber[];
  services: Service[];
  branches: Branch[];
  settings?: TenantSettings;
  appointmentServices: { appointment_id: string; service_id: string; price: number }[];
  now?: Date;
}): BusinessIntelligenceSnapshot {
  const {
    tenantId,
    appointments,
    customers,
    barbers,
    services,
    branches,
    settings,
    appointmentServices,
    now = new Date(),
  } = params;

  const tenantAppts = appointments.filter((a) => a.tenant_id === tenantId && !a.deleted_at);
  const currentMonth = now.getUTCMonth();
  const currentYear = now.getUTCFullYear();

  const monthAppts = tenantAppts.filter((a) => {
    const d = new Date(a.starts_at);
    return d.getUTCMonth() === currentMonth && d.getUTCFullYear() === currentYear;
  });

  const realizedRevenueMonth = monthAppts
    .filter((a) => a.status === 'completed')
    .reduce((acc, a) => acc + a.total_amount, 0);

  const projectedAgendaRevenue = monthAppts
    .filter((a) => (a.status === 'confirmed' || a.status === 'pending' || a.status === 'in_progress') && new Date(a.starts_at) >= now)
    .reduce((acc, a) => acc + a.total_amount, 0);

  // Inteligência de horários de baixa ocupação (09h..19h)
  const activeBarbersCount = Math.max(
    1,
    barbers.filter((b) => b.tenant_id === tenantId && b.is_active && !b.deleted_at).length
  );
  const hourBuckets = [9, 10, 11, 14, 15, 16, 17, 18, 19];
  const lowOccupancyHours = hourBuckets
    .map((hour) => {
      const count = tenantAppts.filter((a) => {
        if (a.status === 'cancelled') return false;
        const { timeStr } = getZonedDateParts(a.starts_at);
        return Number(timeStr.split(':')[0]) === hour;
      }).length;
      const capacity = activeBarbersCount * 6; // base de 6 dias úteis analisados
      const occupancyPercent = Math.min(100, Math.round((count / Math.max(1, capacity)) * 100));
      return {
        hourLabel: `${hour.toString().padStart(2, '0')}:00`,
        occupancyPercent,
        recommendation:
          occupancyPercent < 40
            ? 'Criar campanha relâmpago ou combo com desconto para este horário.'
            : 'Ocupação saudável.',
      };
    })
    .filter((h) => h.occupancyPercent < 55);

  // Rentabilidade e sugestão de preço dos serviços
  const serviceProfitability = services
    .filter((s) => s.tenant_id === tenantId && !s.deleted_at)
    .map((svc) => {
      const bookingsCount = appointmentServices.filter((as) => as.service_id === svc.id).length;
      const marginPercent =
        svc.price > 0
          ? Math.round(((svc.price - svc.cost_estimate) / svc.price) * 100)
          : 0;
      const ticketPerMinute = svc.duration_minutes > 0 ? svc.price / svc.duration_minutes : 0;

      let suggestion = 'Precificação equilibrada.';
      if (marginPercent < 65) {
        suggestion = `Margem de ${marginPercent}% abaixo da meta de 70%. Considere reajuste para R$ ${(svc.price * 1.12).toFixed(2)}.`;
      } else if (ticketPerMinute < 1.2 && bookingsCount >= 3) {
        suggestion = 'Alta procura com valor/minuto baixo; bom candidato para combo premium.';
      }

      return {
        serviceId: svc.id,
        name: svc.name,
        currentPrice: svc.price,
        estimatedCost: svc.cost_estimate,
        marginPercent,
        bookingsCount,
        suggestion,
      };
    });

  // Rentabilidade por profissional
  const barberProfitability = barbers
    .filter((b) => b.tenant_id === tenantId && !b.deleted_at)
    .map((barber) => {
      const completed = tenantAppts.filter(
        (a) => a.barber_id === barber.id && a.status === 'completed'
      );
      const grossRevenue = completed.reduce((acc, a) => acc + a.total_amount, 0);
      const goalProgressPercent =
        barber.monthly_revenue_goal > 0
          ? Math.min(100, Math.round((grossRevenue / barber.monthly_revenue_goal) * 100))
          : 0;

      return {
        barberId: barber.id,
        name: barber.name,
        completedCount: completed.length,
        grossRevenue: Number(grossRevenue.toFixed(2)),
        goalAmount: barber.monthly_revenue_goal,
        goalProgressPercent,
        averageTicket:
          completed.length > 0 ? Number((grossRevenue / completed.length).toFixed(2)) : 0,
      };
    });

  // Comparação entre unidades
  const branchComparison = branches
    .filter((b) => b.tenant_id === tenantId && !b.deleted_at)
    .map((branch) => {
      const bAppts = tenantAppts.filter((a) => a.branch_id === branch.id);
      const completed = bAppts.filter((a) => a.status === 'completed');
      const noShows = bAppts.filter((a) => a.status === 'no_show').length;
      const attendanceDenom = completed.length + noShows;

      return {
        branchId: branch.id,
        name: branch.name,
        appointmentsCount: bAppts.length,
        completedRevenue: Number(completed.reduce((acc, a) => acc + a.total_amount, 0).toFixed(2)),
        attendanceRate:
          attendanceDenom > 0 ? Math.round((completed.length / attendanceDenom) * 100) : 100,
      };
    });

  // Clientes inativos para recuperação automática
  const classifiedCustomers = customers
    .filter((c) => c.tenant_id === tenantId && !c.deleted_at && !c.anonymized_at)
    .map((c) => classifyCustomer(c, settings, now));

  const inactiveCustomersForRecovery = classifiedCustomers.filter((ci) =>
    ci.segments.includes('inactive')
  );

  // Prevenção de faltas nos próximos agendamentos
  const highRiskUpcomingAppointments = tenantAppts
    .filter((a) => (a.status === 'pending' || a.status === 'confirmed') && new Date(a.starts_at) >= now)
    .map((a) => {
      const cust = customers.find((c) => c.id === a.customer_id);
      if (!cust || (cust.no_show_count === 0 && cust.cancelled_count < 2)) return null;
      return {
        appointmentId: a.id,
        customerName: cust.full_name,
        startsAt: a.starts_at,
        noShowCount: cust.no_show_count,
        cancelledCount: cust.cancelled_count,
        recommendation:
          'Solicitar confirmação via WhatsApp 2h antes ou exigir sinal antecipado via Pix.',
      };
    })
    .filter((x): x is NonNullable<typeof x> => x !== null);

  return {
    realizedRevenueMonth: Number(realizedRevenueMonth.toFixed(2)),
    projectedAgendaRevenue: Number(projectedAgendaRevenue.toFixed(2)),
    estimatedTotalMonthRevenue: Number((realizedRevenueMonth + projectedAgendaRevenue).toFixed(2)),
    lowOccupancyHours,
    serviceProfitability,
    barberProfitability,
    branchComparison,
    inactiveCustomersForRecovery,
    highRiskUpcomingAppointments,
  };
}
