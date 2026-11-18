'use client';

import { useAdminData } from '@/components/admin/AdminShell';
import { formatCurrencyBRL, formatDateTimeBR } from '@/lib/utils';

export default function AdminPaymentsPage() {
  const { data } = useAdminData();
  if (!data) return null;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-serif text-3xl font-semibold">Pagamentos & Receita SaaS</h1>
        <p className="text-xs text-[#B59E8D]">
          Histórico exclusivo das cobranças de assinaturas da plataforma Kortaz (separado dos caixas dos estabelecimentos).
        </p>
      </div>

      <div className="rounded-xl border border-white/10 bg-[#18100C] p-5">
        <div className="space-y-2 text-xs">
          {data.subscriptionEvents.map((ev) => (
            <div
              key={ev.id}
              className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-white/5 bg-[#0E0906] p-3"
            >
              <div>
                <p className="font-bold text-[#F7EFE6]">
                  {data.tenants.find((t) => t.id === ev.tenant_id)?.name}
                </p>
                <p className="text-[#B59E8D]">
                  Evento: <span className="text-[#D49B6A]">{ev.event_type}</span> &bull; Plano:{' '}
                  {ev.to_plan_code}
                </p>
              </div>
              <div className="text-right">
                <p className="font-bold text-[#45C486]">{formatCurrencyBRL(ev.amount)}</p>
                <p className="text-[#B59E8D]">{formatDateTimeBR(ev.created_at)}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
