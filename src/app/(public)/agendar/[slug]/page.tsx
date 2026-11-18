import { notFound } from 'next/navigation';
import { readDb } from '@/lib/server/store';
import { BarbershopPublicView } from '@/components/public/BarbershopPublicView';

export const dynamic = 'force-dynamic';

export default async function DedicatedBookingPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const db = await readDb();

  const tenant = db.tenants.find((t) => t.slug === slug && !t.deleted_at);
  if (!tenant) notFound();

  const settings = db.tenant_settings.find((s) => s.tenant_id === tenant.id);
  const branches = db.branches.filter((b) => b.tenant_id === tenant.id && !b.deleted_at);
  const services = db.services.filter((s) => s.tenant_id === tenant.id && !s.deleted_at);
  const barbers = db.barbers.filter((b) => b.tenant_id === tenant.id && !b.deleted_at);
  const reviews = db.reviews.filter((r) => r.tenant_id === tenant.id && r.is_published);

  return (
    <BarbershopPublicView
      tenant={tenant}
      settings={settings}
      branches={branches}
      services={services}
      barbers={barbers}
      reviews={reviews}
      bookingOnlyMode={true}
    />
  );
}
