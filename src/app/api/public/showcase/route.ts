import { NextResponse } from 'next/server';
import { readDb } from '@/lib/server/store';

export async function GET(request: Request) {
  const url = new URL(request.url);
  const slug = url.searchParams.get('slug') || 'barbearia-exclusiva';
  const db = await readDb();

  const tenant = db.tenants.find((t) => t.slug === slug && !t.deleted_at);
  if (!tenant) {
    return NextResponse.json({ error: 'Estabelecimento não encontrado.' }, { status: 404 });
  }

  const branches = db.branches.filter(
    (b) => b.tenant_id === tenant.id && b.is_active && !b.deleted_at
  );
  const services = db.services.filter(
    (s) => s.tenant_id === tenant.id && s.is_active && !s.deleted_at
  );
  const barbers = db.barbers.filter(
    (b) => b.tenant_id === tenant.id && b.is_active && !b.deleted_at
  );

  return NextResponse.json({
    tenant: {
      id: tenant.id,
      name: tenant.name,
      slug: tenant.slug,
      status: tenant.status,
    },
    branches,
    services,
    barbers,
  });
}
