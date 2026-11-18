'use client';

import { useMemo } from 'react';
import {
  AlertTriangle,
  Building,
  CreditCard,
  DollarSign,
  TrendingDown,
  TrendingUp,
} from 'lucide-react';
import { useAdminData } from '@/components/admin/AdminShell';
import { Badge } from '@/components/ui/Badge';
import { RevenueAreaChart } from '@/components/ui/Charts';
import { PageHeader } from '@/components/ui/PageHeader';
import { formatCurrencyBRL } from '@/lib/utils';

export default function SuperAdminDashboardPage() {
  const { data } = useAdminData();

  const growthSeries = useMemo(() => {
    if (!data) return [];
    const grouped = new Map<string, number>();
    for (const ev of data.subscriptionEvents) {
      const d = new Date(ev.created_at);
      const key = `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`;
      grouped.set(key, (grouped.get(key) || 0) + ev.amount);
    }
    const entries = [...grouped.entries()].slice(-8).map(([label, value]) => ({ label, value }));
    if (entries.length === 0) {
      return [
        { label: 'Atual', value: data.metrics.mrr },
      ];
    }
    return entries;
  }, [data]);

  if (!data) return null;

  const { metrics } = data;
  const pendingPayments = data.subscriptions.filter((s) => s.status === 'past_due').length;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="CONSOLE SUPER ADMIN"
        title="Visão Geral da Plataforma Kortaz"
        description="Métricas consolidadas do SaaS, totalmente isoladas do caixa dos estabelecimentos."
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <div className="rounded-2xl border border-[#292521] bg-[#151515] p-5">
          <div className="flex items-center justify-between text-xs text-[#A5A09A]">
            <span>Estabelecimentos</span>
            <Building className="h-4 w-4 text-[#D99A4E]" />
          </div>
          <p className="mt-3 font-display text-2xl font-bold text-[#F5F1EB]">
            {metrics.totalBarbershops}
          </p>
          <p className="mt-1 text-[11px] text-[#A5A09A]">{metrics.activeAccounts} ativos</p>
        </div>

        <div className="rounded-2xl border border-[#292521] bg-[#151515] p-5">
          <div className="flex items-center justify-between text-xs text-[#A5A09A]">
            <span>Assinaturas Ativas</span>
            <CreditCard className="h-4 w-4 text-[#4299E1]" />
          </div>
          <p className="mt-3 font-display text-2xl font-bold text-[#F5F1EB]">
            {metrics.paidSubscribers}
          </p>
          <p className="mt-1 text-[11px] text-[#A5A09A]">{metrics.freeAccounts} contas gratuitas</p>
        </div>

        <div className="rounded-2xl border border-[#292521] bg-[#151515] p-5">
          <div className="flex items-center justify-between text-xs text-[#A5A09A]">
            <span>MRR (Recorrente)</span>
            <DollarSign className="h-4 w-4 text-[#16C784]" />
          </div>
          <p className="mt-3 font-display text-2xl font-bold text-[#16C784]">
            {formatCurrencyBRL(metrics.mrr)}
          </p>
          <p className="mt-1 text-[11px] text-[#A5A09A]">ARR: {formatCurrencyBRL(metrics.arr)}</p>
        </div>

        <div className="rounded-2xl border border-[#292521] bg-[#151515] p-5">
          <div className="flex items-center justify-between text-xs text-[#A5A09A]">
            <span>Pagamentos Pendentes</span>
            <AlertTriangle className="h-4 w-4 text-[#F2B968]" />
          </div>
          <p className="mt-3 font-display text-2xl font-bold text-[#F2B968]">
            {pendingPayments}
          </p>
          <p className="mt-1 text-[11px] text-[#A5A09A]">
            {data.notificationFailures.length} alerta(s) de fila
          </p>
        </div>

        <div className="rounded-2xl border border-[#292521] bg-[#151515] p-5">
          <div className="flex items-center justify-between text-xs text-[#A5A09A]">
            <span>Cancelamentos</span>
            <TrendingDown className="h-4 w-4 text-[#EF5350]" />
          </div>
          <p className="mt-3 font-display text-2xl font-bold text-[#EF5350]">
            {metrics.cancelledSubscriptions}
          </p>
          <p className="mt-1 text-[11px] text-[#A5A09A]">Churn: {metrics.churnRate}%</p>
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-12">
        <div className="rounded-2xl border border-[#292521] bg-[#151515] p-5 lg:col-span-7">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-display text-base font-bold text-[#F5F1EB]">
                Crescimento de Receita SaaS
              </h2>
              <p className="text-xs text-[#A5A09A]">
                Eventos de assinatura registrados na plataforma
              </p>
            </div>
            <Badge variant="bronze">
              <TrendingUp className="h-3 w-3" />
              Mês: {formatCurrencyBRL(metrics.platformRevenueMonth)}
            </Badge>
          </div>
          <div className="mt-4">
            <RevenueAreaChart data={growthSeries} />
          </div>
        </div>

        <div className="rounded-2xl border border-[#292521] bg-[#151515] p-5 lg:col-span-5">
          <h2 className="font-display text-base font-bold text-[#F5F1EB]">Últimas Atividades</h2>
          <p className="text-xs text-[#A5A09A]">Assinaturas e auditoria recente</p>
          <div className="mt-4 space-y-2.5 text-xs">
            {data.subscriptionEvents.slice(0, 6).map((ev) => (
              <div
                key={ev.id}
                className="flex items-center justify-between rounded-xl border border-[#292521] bg-[#1B1B1B] px-3.5 py-2.5"
              >
                <div className="min-w-0">
                  <p className="truncate font-semibold text-[#F5F1EB]">
                    {data.tenants.find((t) => t.id === ev.tenant_id)?.name || 'Estabelecimento'}
                  </p>
                  <p className="text-[11px] text-[#A5A09A]">
                    {ev.event_type.toUpperCase()} · {ev.to_plan_code}
                  </p>
                </div>
                <span className="shrink-0 font-bold text-[#16C784]">
                  {formatCurrencyBRL(ev.amount)}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
