'use client';

import { Building, CreditCard, DollarSign, TrendingDown, TrendingUp } from 'lucide-react';
import { useAdminData } from '@/components/admin/AdminShell';
import { formatCurrencyBRL } from '@/lib/utils';

export default function SuperAdminDashboardPage() {
  const { data } = useAdminData();
  if (!data) return null;

  const { metrics } = data;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-serif text-3xl font-semibold">Console Super Admin — Kortaz OS</h1>
        <p className="text-xs text-[#B59E8D]">
          Métricas consolidadas da plataforma SaaS (totalmente isoladas do caixa das barbearias).
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {[
          { label: 'Total de Barbearias', val: String(metrics.totalBarbershops), icon: Building, color: 'text-[#F7EFE6]' },
          { label: 'Contas Ativas', val: String(metrics.activeAccounts), icon: Building, color: 'text-[#45C486]' },
          { label: 'Gratuitas / Pagas', val: `${metrics.freeAccounts} free • ${metrics.paidSubscribers} pagas`, icon: CreditCard, color: 'text-[#D49B6A]' },
          { label: 'MRR (Receita Recorrente)', val: formatCurrencyBRL(metrics.mrr), icon: DollarSign, color: 'text-[#45C486]' },
          { label: 'ARR Projetado', val: formatCurrencyBRL(metrics.arr), icon: TrendingUp, color: 'text-[#D49B6A]' },
        ].map((card) => (
          <div key={card.label} className="rounded-xl border border-white/10 bg-[#18100C] p-4">
            <div className="flex items-center justify-between text-xs text-[#B59E8D]">
              <span>{card.label}</span>
              <card.icon className={`h-4 w-4 ${card.color}`} />
            </div>
            <p className={`mt-2 text-lg font-bold ${card.color}`}>{card.val}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-white/10 bg-[#18100C] p-4">
          <p className="text-xs text-[#B59E8D]">Taxa de Churn</p>
          <p className="mt-1 flex items-center gap-2 text-xl font-bold text-[#F7EFE6]">
            <TrendingDown className="h-4 w-4 text-[#E06258]" /> {metrics.churnRate}%
          </p>
        </div>
        <div className="rounded-xl border border-white/10 bg-[#18100C] p-4">
          <p className="text-xs text-[#B59E8D]">Assinaturas Canceladas</p>
          <p className="mt-1 text-xl font-bold text-[#E06258]">{metrics.cancelledSubscriptions}</p>
        </div>
        <div className="rounded-xl border border-white/10 bg-[#18100C] p-4">
          <p className="text-xs text-[#B59E8D]">Falhas / Pendências de Integração</p>
          <p className="mt-1 text-xl font-bold text-[#D49B6A]">
            {data.notificationFailures.length} alerta(s)
          </p>
        </div>
      </div>

      <div className="rounded-xl border border-white/10 bg-[#18100C] p-5">
        <h2 className="text-sm font-semibold">Últimos Eventos de Assinatura</h2>
        <div className="mt-3 space-y-2 text-xs">
          {data.subscriptionEvents.slice(0, 10).map((ev) => (
            <div
              key={ev.id}
              className="flex items-center justify-between rounded border border-white/5 bg-[#0E0906] px-3 py-2"
            >
              <span>
                <strong className="text-[#D49B6A]">{ev.event_type.toUpperCase()}</strong> &mdash;{' '}
                {data.tenants.find((t) => t.id === ev.tenant_id)?.name} ({ev.to_plan_code})
              </span>
              <span className="font-semibold text-[#45C486]">{formatCurrencyBRL(ev.amount)}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
