'use client';

import { useAdminData } from '@/components/admin/AdminShell';
import { formatCurrencyBRL, formatDateBR } from '@/lib/utils';

export default function AdminSubscriptionsPage() {
  const { data } = useAdminData();
  if (!data) return null;

  return (
    <div className="space-y-6">
      <h1 className="font-serif text-3xl font-semibold">Assinaturas Ativas & Trials</h1>
      <div className="overflow-x-auto rounded-xl border border-white/10 bg-[#18100C] p-5">
        <table className="w-full text-left text-xs">
          <thead className="border-b border-white/10 text-[#B59E8D]">
            <tr>
              <th className="py-2 pr-4">Barbearia</th>
              <th className="py-2 pr-4">Plano</th>
              <th className="py-2 pr-4">Status</th>
              <th className="py-2 pr-4">Valor</th>
              <th className="py-2 pr-4">Desconto Cupom</th>
              <th className="py-2">Fim do Ciclo</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {data.subscriptions.map((sub) => {
              const t = data.tenants.find((x) => x.id === sub.tenant_id);
              const p = data.plans.find((x) => x.id === sub.plan_id);
              return (
                <tr key={sub.id}>
                  <td className="py-3 pr-4 font-semibold">{t?.name}</td>
                  <td className="py-3 pr-4 text-[#D49B6A]">{p?.name}</td>
                  <td className="py-3 pr-4 uppercase">{sub.status}</td>
                  <td className="py-3 pr-4">{formatCurrencyBRL(sub.price_at_subscription)}</td>
                  <td className="py-3 pr-4">{formatCurrencyBRL(sub.discount_amount)}</td>
                  <td className="py-3">{formatDateBR(sub.current_period_end)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
