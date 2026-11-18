import type {
  Appointment,
  Barber,
  BarberService,
  BlockedTime,
  Service,
  WorkingHour,
} from '@/lib/types/domain';

export interface TimeSlotOption {
  time: string; // HH:mm
  startsAt: string; // ISO
  endsAt: string; // ISO
  barberId: string;
  barberName: string;
  available: boolean;
  reason?: string;
}

function parseMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
}

function formatMinutes(totalMinutes: number): string {
  const h = Math.floor(totalMinutes / 60)
    .toString()
    .padStart(2, '0');
  const m = (totalMinutes % 60).toString().padStart(2, '0');
  return `${h}:${m}`;
}

/**
 * Converte uma data YYYY-MM-DD + HH:mm no fuso configurado (padrão America/Sao_Paulo = -03:00)
 * para um objeto Date UTC consistente e livre de desvios do fuso do servidor.
 */
export function buildZonedIso(dateStr: string, timeStr: string, timezone = 'America/Sao_Paulo'): string {
  const offset = timezone === 'America/Manaus' ? '-04:00' : '-03:00';
  return new Date(`${dateStr}T${timeStr}:00${offset}`).toISOString();
}

export function getZonedDateParts(iso: string, timezone = 'America/Sao_Paulo'): {
  dateStr: string;
  timeStr: string;
  dayOfWeek: number;
  minutesFromMidnight: number;
} {
  const date = new Date(iso);
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    weekday: 'short',
  });
  const parts = formatter.formatToParts(date);
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? '';
  const year = get('year');
  const month = get('month');
  const day = get('day');
  const hour = get('hour') === '24' ? '00' : get('hour');
  const minute = get('minute');
  const weekdayMap: Record<string, number> = {
    Sun: 0,
    Mon: 1,
    Tue: 2,
    Wed: 3,
    Thu: 4,
    Fri: 5,
    Sat: 6,
  };
  return {
    dateStr: `${year}-${month}-${day}`,
    timeStr: `${hour}:${minute}`,
    dayOfWeek: weekdayMap[get('weekday')] ?? date.getUTCDay(),
    minutesFromMidnight: Number(hour) * 60 + Number(minute),
  };
}

export function intervalsOverlap(aStartMs: number, aEndMs: number, bStartMs: number, bEndMs: number): boolean {
  return aStartMs < bEndMs && bStartMs < aEndMs;
}

export function computeServicesDurationAndPrice(params: {
  serviceIds: string[];
  barberId?: string | null;
  services: Service[];
  barberServices: BarberService[];
}): {
  selectedServices: Service[];
  totalDurationMinutes: number;
  totalBufferMinutes: number;
  subtotalAmount: number;
} {
  const selectedServices: Service[] = [];
  let totalDurationMinutes = 0;
  let totalBufferMinutes = 0;
  let subtotalAmount = 0;

  for (const serviceId of params.serviceIds) {
    const svc = params.services.find((s) => s.id === serviceId && s.is_active && !s.deleted_at);
    if (!svc) continue;
    const override = params.barberId
      ? params.barberServices.find(
          (bs) => bs.barber_id === params.barberId && bs.service_id === svc.id
        )
      : undefined;

    const dur = override?.custom_duration_minutes ?? svc.duration_minutes;
    const price = override?.custom_price ?? svc.price;

    selectedServices.push(svc);
    totalDurationMinutes += dur;
    totalBufferMinutes += svc.buffer_minutes;
    subtotalAmount += price;
  }

  return {
    selectedServices,
    totalDurationMinutes,
    totalBufferMinutes,
    subtotalAmount: Number(subtotalAmount.toFixed(2)),
  };
}

/**
 * Valida estritamente no servidor se um intervalo para o barbeiro está 100% livre
 * considerando expediente, intervalo de almoço, bloqueios manuais/férias e outros agendamentos.
 */
export function checkBarberSlotAvailability(params: {
  barber: Barber;
  startsAtIso: string;
  durationMinutes: number;
  workingHours: WorkingHour[];
  blockedTimes: BlockedTime[];
  appointments: Appointment[];
  ignoreAppointmentId?: string;
  timezone?: string;
}): { available: boolean; reason?: string; endsAtIso: string } {
  const {
    barber,
    startsAtIso,
    durationMinutes,
    workingHours,
    blockedTimes,
    appointments,
    ignoreAppointmentId,
    timezone = 'America/Sao_Paulo',
  } = params;

  const startMs = new Date(startsAtIso).getTime();
  const endMs = startMs + durationMinutes * 60_000;
  const endsAtIso = new Date(endMs).toISOString();

  if (!barber.is_active || barber.deleted_at) {
    return { available: false, reason: 'Profissional inativo no momento.', endsAtIso };
  }

  const startLocal = getZonedDateParts(startsAtIso, timezone);
  const endLocal = getZonedDateParts(endsAtIso, timezone);

  const wh = workingHours.find(
    (w) => w.barber_id === barber.id && w.day_of_week === startLocal.dayOfWeek
  );

  if (!wh || wh.is_day_off) {
    return { available: false, reason: 'Profissional não atende neste dia da semana.', endsAtIso };
  }

  const workStartMin = parseMinutes(wh.start_time);
  const workEndMin = parseMinutes(wh.end_time);
  const reqStartMin = startLocal.minutesFromMidnight;
  const reqEndMin =
    endLocal.dateStr !== startLocal.dateStr
      ? 24 * 60 + endLocal.minutesFromMidnight
      : endLocal.minutesFromMidnight;

  if (reqStartMin < workStartMin || reqEndMin > workEndMin) {
    return {
      available: false,
      reason: `Fora do expediente de ${barber.name} (${wh.start_time} às ${wh.end_time}).`,
      endsAtIso,
    };
  }

  if (wh.break_start && wh.break_end) {
    const breakStartMin = parseMinutes(wh.break_start);
    const breakEndMin = parseMinutes(wh.break_end);
    if (intervalsOverlap(reqStartMin, reqEndMin, breakStartMin, breakEndMin)) {
      return {
        available: false,
        reason: `Conflito com intervalo do profissional (${wh.break_start} às ${wh.break_end}).`,
        endsAtIso,
      };
    }
  }

  // Bloqueios manuais / folgas / férias
  const conflictingBlock = blockedTimes.find((b) => {
    if (b.barber_id !== barber.id) return false;
    return intervalsOverlap(startMs, endMs, new Date(b.starts_at).getTime(), new Date(b.ends_at).getTime());
  });

  if (conflictingBlock) {
    return {
      available: false,
      reason: `Horário bloqueado: ${conflictingBlock.reason}.`,
      endsAtIso,
    };
  }

  // Agendamentos ativos existentes
  const conflictingAppt = appointments.find((a) => {
    if (a.id === ignoreAppointmentId) return false;
    if (a.barber_id !== barber.id) return false;
    if (a.deleted_at || a.status === 'cancelled' || a.status === 'no_show') return false;
    return intervalsOverlap(startMs, endMs, new Date(a.starts_at).getTime(), new Date(a.ends_at).getTime());
  });

  if (conflictingAppt) {
    return {
      available: false,
      reason: 'Horário já reservado para outro cliente.',
      endsAtIso,
    };
  }

  return { available: true, endsAtIso };
}

/**
 * Gera grade de horários disponíveis para uma data YYYY-MM-DD.
 * Se `barberId` for omitido ("Qualquer profissional"), recomenda automaticamente o barbeiro com menor ocupação/melhor disponibilidade no horário.
 */
export function getAvailableSlotsForDate(params: {
  tenantId: string;
  branchId: string;
  dateStr: string;
  serviceIds: string[];
  barberId?: string | null;
  barbers: Barber[];
  services: Service[];
  barberServices: BarberService[];
  workingHours: WorkingHour[];
  blockedTimes: BlockedTime[];
  appointments: Appointment[];
  timezone?: string;
  stepMinutes?: number;
}): TimeSlotOption[] {
  const {
    tenantId,
    branchId,
    dateStr,
    serviceIds,
    barberId,
    barbers,
    services,
    barberServices,
    workingHours,
    blockedTimes,
    appointments,
    timezone = 'America/Sao_Paulo',
    stepMinutes = 30,
  } = params;

  const candidateBarbers = barbers.filter(
    (b) =>
      b.tenant_id === tenantId &&
      b.branch_id === branchId &&
      b.is_active &&
      !b.deleted_at &&
      (!barberId || b.id === barberId)
  );

  if (candidateBarbers.length === 0 || serviceIds.length === 0) return [];

  const { totalDurationMinutes, totalBufferMinutes } = computeServicesDurationAndPrice({
    serviceIds,
    barberId: barberId ?? candidateBarbers[0].id,
    services,
    barberServices,
  });

  const blockDuration = Math.max(15, totalDurationMinutes + totalBufferMinutes);
  const sampleIso = buildZonedIso(dateStr, '12:00', timezone);
  const dayOfWeek = getZonedDateParts(sampleIso, timezone).dayOfWeek;

  // Coleta limites min/max de horário de atendimento
  let minMinute = 9 * 60;
  let maxMinute = 20 * 60;

  const relevantHours = workingHours.filter(
    (w) => candidateBarbers.some((b) => b.id === w.barber_id) && w.day_of_week === dayOfWeek && !w.is_day_off
  );

  if (relevantHours.length === 0) return [];

  minMinute = Math.min(...relevantHours.map((w) => parseMinutes(w.start_time)));
  maxMinute = Math.max(...relevantHours.map((w) => parseMinutes(w.end_time)));

  const slots: TimeSlotOption[] = [];

  for (let m = minMinute; m + blockDuration <= maxMinute; m += stepMinutes) {
    const hhmm = formatMinutes(m);
    const startsAtIso = buildZonedIso(dateStr, hhmm, timezone);

    let chosenBarber: Barber | null = null;
    let chosenEndsAt = startsAtIso;
    let lastReason = 'Indisponível';

    // Agenda inteligente: quando não há barbeiro fixo, escolhe quem tem menos agendamentos no dia
    const sortedCandidates = [...candidateBarbers].sort((a, b) => {
      const aCount = appointments.filter(
        (ap) =>
          ap.barber_id === a.id &&
          ap.status !== 'cancelled' &&
          getZonedDateParts(ap.starts_at, timezone).dateStr === dateStr
      ).length;
      const bCount = appointments.filter(
        (ap) =>
          ap.barber_id === b.id &&
          ap.status !== 'cancelled' &&
          getZonedDateParts(ap.starts_at, timezone).dateStr === dateStr
      ).length;
      return aCount - bCount;
    });

    for (const candidate of sortedCandidates) {
      const check = checkBarberSlotAvailability({
        barber: candidate,
        startsAtIso,
        durationMinutes: blockDuration,
        workingHours,
        blockedTimes,
        appointments,
        timezone,
      });

      if (check.available) {
        chosenBarber = candidate;
        chosenEndsAt = check.endsAtIso;
        break;
      } else if (check.reason) {
        lastReason = check.reason;
      }
    }

    slots.push({
      time: hhmm,
      startsAt: startsAtIso,
      endsAt: chosenEndsAt,
      barberId: chosenBarber?.id ?? sortedCandidates[0].id,
      barberName: chosenBarber?.name ?? sortedCandidates[0].name,
      available: Boolean(chosenBarber),
      reason: chosenBarber ? undefined : lastReason,
    });
  }

  return slots;
}
