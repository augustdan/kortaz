import { NextResponse } from 'next/server';
import { readDb } from '@/lib/server/store';
import { getAvailableSlotsForDate } from '@/lib/domain/scheduling';

export async function GET(request: Request) {
  const url = new URL(request.url);
  const slug = url.searchParams.get('slug');
  const tenantIdParam = url.searchParams.get('tenantId');
  const branchIdParam = url.searchParams.get('branchId');
  const dateStr = url.searchParams.get('date'); // YYYY-MM-DD
  const barberId = url.searchParams.get('barberId') || null;
  const serviceIdsRaw = url.searchParams.get('serviceIds') || '';
  const serviceIds = serviceIdsRaw.split(',').filter(Boolean);

  if (!dateStr || !/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    return NextResponse.json({ error: 'Parâmetro date=YYYY-MM-DD inválido.' }, { status: 400 });
  }

  const db = await readDb();
  const tenant = tenantIdParam
    ? db.tenants.find((t) => t.id === tenantIdParam && !t.deleted_at)
    : db.tenants.find((t) => t.slug === slug && !t.deleted_at);

  if (!tenant) {
    return NextResponse.json({ error: 'Barbearia não encontrada.' }, { status: 404 });
  }

  const branch =
    (branchIdParam
      ? db.branches.find((b) => b.id === branchIdParam && b.tenant_id === tenant.id)
      : null) ?? db.branches.find((b) => b.tenant_id === tenant.id && b.is_headquarters);

  if (!branch) {
    return NextResponse.json({ error: 'Unidade não encontrada.' }, { status: 404 });
  }

  const effectiveServiceIds =
    serviceIds.length > 0
      ? serviceIds
      : db.services
          .filter((s) => s.tenant_id === tenant.id && s.is_active)
          .slice(0, 1)
          .map((s) => s.id);

  const slots = getAvailableSlotsForDate({
    tenantId: tenant.id,
    branchId: branch.id,
    dateStr,
    serviceIds: effectiveServiceIds,
    barberId,
    barbers: db.barbers,
    services: db.services,
    barberServices: db.barber_services,
    workingHours: db.working_hours,
    blockedTimes: db.blocked_times,
    appointments: db.appointments,
    timezone: branch.timezone,
  });

  return NextResponse.json({
    tenantId: tenant.id,
    branchId: branch.id,
    date: dateStr,
    slots,
  });
}
