'use client';

import { useAdminData } from '@/components/admin/AdminShell';
import { formatCurrencyBRL, formatDateTimeBR } from '@/lib/utils';

export default function AdminPaymentsPage() {
  const { data } = useAdminData();
  if (!data) return null;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl font-semibold">Pagamentos & Receita SaaS</h1>
        <p className="text-xs text-[#A5A09A]">
          Histórico exclusivo das cobranças de assinaturas da plataforma Kortaz (separado dos caixas dos estabelecimentos).
        </p>
      </div>

      <div className="rounded-xl border border-[#292521] bg-[#151515] p-5">
        <div className="space-y-2 text-xs">
          {data.subscriptionEvents.map((ev) => (
            <div
              key={ev.id}
              className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-[#292521]/70 bg-[#090909] p-3"
            >
              <div>
                <p className="font-bold text-[#F5F1EB]">
                  {data.tenants.find((t) => t.id === ev.tenant_id)?.name}
                </p>
                <p className="text-[#A5A09A]">
                  Evento: <span className="text-[#D99A4E]">{ev.event_type}</span> &bull; Plano:{' '}
                  {ev.to_plan_code}
                </p>
              </div>
              <div className="text-right">
                <p className="font-bold text-[#16C784]">{formatCurrencyBRL(ev.amount)}</p>
                <p className="text-[#A5A09A]">{formatDateTimeBR(ev.created_at)}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
