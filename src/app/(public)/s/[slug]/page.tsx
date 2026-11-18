import { notFound } from 'next/navigation';
import { readDb } from '@/lib/server/store';
import { BarbershopPublicView } from '@/components/public/BarbershopPublicView';

export const dynamic = 'force-dynamic';

export default async function PublicBarbershopPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ review?: string }>;
}) {
  const { slug } = await params;
  const { review } = await searchParams;
  const db = await readDb();

  const tenant = db.tenants.find((t) => t.slug === slug && !t.deleted_at);
  if (!tenant) notFound();

  if (tenant.status === 'suspended') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0B0B0B] p-6 text-center text-[#F5F2EC]">
        <div className="max-w-md rounded-2xl border border-white/10 bg-[#151515] p-8">
          <h1 className="font-serif text-3xl text-[#C9A063]">{tenant.name}</h1>
          <p className="mt-3 text-sm text-[#A5A5A5]">
            Esta página está temporariamente indisponível. Entre em contato diretamente com o estabelecimento.
          </p>
        </div>
      </div>
    );
  }

  const settings = db.tenant_settings.find((s) => s.tenant_id === tenant.id);
  const branches = db.branches.filter((b) => b.tenant_id === tenant.id && !b.deleted_at);
  const services = db.services.filter((s) => s.tenant_id === tenant.id && !s.deleted_at);
  const barbers = db.barbers.filter((b) => b.tenant_id === tenant.id && !b.deleted_at);
  const reviews = db.reviews
    .filter((r) => r.tenant_id === tenant.id && r.is_published)
    .map((r) => ({
      ...r,
      customerName: db.customers.find((c) => c.id === r.customer_id)?.full_name || 'Cliente',
      barberName: db.barbers.find((b) => b.id === r.barber_id)?.name || 'Barbeiro',
    }));

  return (
    <BarbershopPublicView
      tenant={tenant}
      settings={settings}
      branches={branches}
      services={services}
      barbers={barbers}
      reviews={reviews}
      initialReviewApptId={review}
    />
  );
}
