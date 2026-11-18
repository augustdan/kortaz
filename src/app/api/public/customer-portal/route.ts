import { NextResponse } from 'next/server';
import { mutateDb, readDb } from '@/lib/server/store';

function normalizePhone(raw: string): string {
  return raw.replace(/\D/g, '');
}

function phonesMatch(a: string | undefined | null, b: string): boolean {
  const da = normalizePhone(a || '');
  const db = normalizePhone(b);
  if (da.length < 8 || db.length < 8) return false;
  return da.slice(-9) === db.slice(-9);
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const slug = url.searchParams.get('slug') || 'barbearia-exclusiva';
  const phone = url.searchParams.get('phone') || '';

  if (normalizePhone(phone).length < 8) {
    return NextResponse.json(
      { error: 'Informe um número de WhatsApp válido (mínimo 8 dígitos).' },
      { status: 400 }
    );
  }

  const db = await readDb();
  const tenant = db.tenants.find((t) => t.slug === slug && !t.deleted_at);
  if (!tenant) {
    return NextResponse.json({ error: 'Estabelecimento não encontrado.' }, { status: 404 });
  }

  const customer = db.customers.find(
    (c) => c.tenant_id === tenant.id && !c.deleted_at && phonesMatch(c.phone, phone)
  );

  if (!customer) {
    return NextResponse.json(
      { error: 'Nenhum cadastro encontrado para este WhatsApp neste estabelecimento.' },
      { status: 404 }
    );
  }

  const loyalty = db.loyalty_accounts.find(
    (l) => l.tenant_id === tenant.id && l.customer_id === customer.id
  );

  const appointments = db.appointments
    .filter((a) => a.tenant_id === tenant.id && a.customer_id === customer.id)
    .sort((a, b) => new Date(b.starts_at).getTime() - new Date(a.starts_at).getTime())
    .map((a) => {
      const barber = db.barbers.find((b) => b.id === a.barber_id);
      const branch = db.branches.find((br) => br.id === a.branch_id);
      const services = db.appointment_services
        .filter((s) => s.appointment_id === a.id)
        .map((s) => s.service_name);

      return {
        id: a.id,
        starts_at: a.starts_at,
        ends_at: a.ends_at,
        status: a.status,
        total_amount: a.total_amount,
        barberName: barber?.name || 'Profissional',
        branchName: branch?.name || tenant.name,
        services: services.length > 0 ? services : ['Atendimento'],
      };
    });

  return NextResponse.json({
    tenant: { id: tenant.id, name: tenant.name, slug: tenant.slug },
    customer: {
      id: customer.id,
      full_name: customer.full_name,
      phone: customer.phone,
      visits_count: customer.visits_count,
      total_spent: customer.total_spent,
    },
    loyalty: {
      points_balance: loyalty?.points_balance ?? 0,
      stamps_balance: loyalty?.stamps_balance ?? 0,
      cashback_balance: loyalty?.cashback_balance ?? 0,
    },
    appointments,
  });
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const action = body?.action as string | undefined;
    const slug = (body?.slug as string | undefined) || 'barbearia-exclusiva';
    const phone = (body?.phone as string | undefined) || '';
    const appointmentId = body?.appointmentId as string | undefined;

    if (action !== 'cancel' || !appointmentId || normalizePhone(phone).length < 8) {
      return NextResponse.json({ error: 'Dados inválidos para cancelamento.' }, { status: 400 });
    }

    const result = await mutateDb((db) => {
      const tenant = db.tenants.find((t) => t.slug === slug && !t.deleted_at);
      if (!tenant) return { ok: false, error: 'Estabelecimento não encontrado.', status: 404 };

      const customer = db.customers.find(
        (c) => c.tenant_id === tenant.id && !c.deleted_at && phonesMatch(c.phone, phone)
      );
      if (!customer) return { ok: false, error: 'Cliente não encontrado.', status: 404 };

      const appt = db.appointments.find(
        (a) => a.id === appointmentId && a.tenant_id === tenant.id && a.customer_id === customer.id
      );
      if (!appt) return { ok: false, error: 'Agendamento não encontrado.', status: 404 };

      if (appt.status === 'completed' || appt.status === 'cancelled') {
        return { ok: false, error: 'Este agendamento não pode mais ser cancelado.', status: 400 };
      }

      appt.status = 'cancelled';
      appt.cancellation_reason = 'Cancelado pelo cliente na Área do Cliente';
      appt.updated_at = new Date().toISOString();

      return { ok: true, status: 200 };
    });

    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: result.status });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Erro interno.' },
      { status: 500 }
    );
  }
}
