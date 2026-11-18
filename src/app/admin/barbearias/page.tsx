'use client';

import { useAdminData } from '@/components/admin/AdminShell';

export default function AdminBarbershopsPage() {
  const { data, refresh } = useAdminData();
  if (!data) return null;

  async function toggleTenantStatus(targetTenantId: string, nextStatus: 'active' | 'suspended') {
    await fetch('/api/admin', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'set_tenant_status',
        targetTenantId,
        status: nextStatus,
      }),
    });
    await refresh();
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-serif text-3xl font-semibold">Barbearias Cadastradas (Tenants)</h1>
        <p className="text-xs text-[#B59E8D]">
          Gerencie contas, planos vinculados e suspenda ou reative acesso sem perder dados.
        </p>
      </div>

      <div className="space-y-3">
        {data.tenants.map((tenant) => {
          const sub = data.subscriptions.find((s) => s.tenant_id === tenant.id);
          const plan = data.plans.find((p) => p.id === sub?.plan_id);
          return (
            <div
              key={tenant.id}
              className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-white/10 bg-[#18100C] p-4 text-xs"
            >
              <div>
                <p className="text-sm font-bold text-[#F7EFE6]">
                  {tenant.name}{' '}
                  <span className="font-normal text-[#B59E8D]">(/s/{tenant.slug})</span>
                </p>
                <p className="mt-0.5 text-[#B59E8D]">
                  {tenant.email} &bull; Plano: <strong className="text-[#D49B6A]">{plan?.name}</strong> &bull; Status:{' '}
                  <strong className={tenant.status === 'suspended' ? 'text-[#E06258]' : 'text-[#45C486]'}>
                    {tenant.status}
                  </strong>
                </p>
              </div>

              <div className="flex gap-2">
                {tenant.status === 'suspended' ? (
                  <button
                    type="button"
                    onClick={() => toggleTenantStatus(tenant.id, 'active')}
                    className="rounded-lg bg-[#45C486] px-3 py-1.5 font-bold text-[#0E0906]"
                  >
                    Reativar Conta
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => toggleTenantStatus(tenant.id, 'suspended')}
                    className="rounded-lg border border-[#E06258]/40 px-3 py-1.5 font-semibold text-[#E06258]"
                  >
                    Suspender Conta
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
