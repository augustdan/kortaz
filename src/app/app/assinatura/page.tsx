'use client';

import { useState } from 'react';
import { Check, CreditCard, ShieldCheck } from 'lucide-react';
import { useWorkspace } from '@/components/app/TenantWorkspaceContext';
import { PermissionGuard } from '@/components/app/PermissionGuard';
import { formatCurrencyBRL, formatDateBR } from '@/lib/utils';

export default function TenantSubscriptionPage() {
  const { data, refresh } = useWorkspace();
  const [couponCode, setCouponCode] = useState('');
  const [feedback, setFeedback] = useState<string | null>(null);

  if (!data) return null;

  const activeBarbers = data.barbers.filter((b) => b.is_active).length;
  const activeBranches = data.branches.filter((b) => b.is_active).length;
  const monthAppointments = data.appointments.filter((a) => a.status !== 'cancelled').length;

  async function handleChangePlan(planCode: string) {
    setFeedback(null);
    const res = await fetch('/api/admin', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'change_tenant_plan',
        tenantId: data!.tenant.id,
        planCode,
        couponCode: couponCode || undefined,
      }),
    });
    const json = await res.json();
    if (!res.ok) {
      setFeedback(json.error);
      return;
    }
    setFeedback(`Plano alterado para ${json.plan?.name} sem perda de dados.`);
    await refresh();
  }

  return (
    <PermissionGuard resource="subscription">
      <div className="space-y-6">
        <div>
          <h1 className="font-serif text-3xl font-semibold">Assinatura & Limites do Plano</h1>
          <p className="text-xs text-[#B59E8D]">
            Acompanhe o consumo em tempo real e faça upgrade ou downgrade com total transparência.
          </p>
        </div>

        {/* Status Atual */}
        <div className="rounded-2xl border border-[#D49B6A]/40 bg-[#18100C] p-6">
          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-widest text-[#D49B6A]">
                PLANO ATUAL
              </span>
              <h2 className="mt-1 font-serif text-3xl font-semibold">
                {data.plan.name}{' '}
                <span className="text-base font-normal text-[#45C486]">
                  ({data.subscription.status})
                </span>
              </h2>
              <p className="mt-1 text-xs text-[#B59E8D]">
                Renovação em {formatDateBR(data.subscription.current_period_end)} &bull; Valor:{' '}
                {data.plan.is_custom_pricing
                  ? 'Sob consulta'
                  : formatCurrencyBRL(
                      Math.max(0, data.plan.price_monthly - data.subscription.discount_amount)
                    )}
                /mês
              </p>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="text"
                placeholder="Cupom SaaS (ex: BARBEROS20)"
                value={couponCode}
                onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                className="rounded-lg border border-white/10 bg-[#0E0906] px-3 py-2 text-xs uppercase"
              />
            </div>
          </div>

          <div className="mt-6 grid gap-4 sm:grid-cols-3 text-xs">
            <div className="rounded-xl bg-[#0E0906] p-4">
              <p className="text-[#B59E8D]">Profissionais ativos</p>
              <p className="mt-1 text-lg font-bold text-[#F7EFE6]">
                {activeBarbers} / {data.plan.max_barbers ?? 'Ilimitados'}
              </p>
            </div>
            <div className="rounded-xl bg-[#0E0906] p-4">
              <p className="text-[#B59E8D]">Agendamentos no mês</p>
              <p className="mt-1 text-lg font-bold text-[#F7EFE6]">
                {monthAppointments} / {data.plan.max_monthly_appointments ?? 'Ilimitados'}
              </p>
            </div>
            <div className="rounded-xl bg-[#0E0906] p-4">
              <p className="text-[#B59E8D]">Unidades / Filiais</p>
              <p className="mt-1 text-lg font-bold text-[#F7EFE6]">
                {activeBranches} / {data.plan.max_branches >= 999 ? 'Ilimitadas' : data.plan.max_branches}
              </p>
            </div>
          </div>
        </div>

        {feedback && (
          <div className="rounded-lg border border-[#45C486]/40 bg-[#45C486]/10 p-3 text-xs text-[#45C486]">
            {feedback}
          </div>
        )}

        {/* Grade de Troca de Plano */}
        <div className="grid gap-4 md:grid-cols-3">
          {data.allPlans.map((plan) => {
            const isCurrent = plan.id === data.plan.id;
            return (
              <div
                key={plan.id}
                className={`flex flex-col justify-between rounded-xl border p-5 ${
                  isCurrent ? 'border-[#D49B6A] bg-[#241710]' : 'border-white/10 bg-[#18100C]'
                }`}
              >
                <div>
                  <h3 className="text-base font-bold">{plan.name}</h3>
                  <p className="mt-1 text-xl font-bold text-[#D49B6A]">
                    {plan.is_custom_pricing
                      ? 'Sob consulta'
                      : formatCurrencyBRL(plan.price_monthly) + '/mês'}
                  </p>
                  <p className="mt-2 text-xs text-[#B59E8D]">{plan.tagline}</p>
                  <ul className="mt-3 space-y-1 text-xs">
                    <li className="flex items-center gap-1.5">
                      <Check className="h-3.5 w-3.5 text-[#45C486]" />
                      {plan.max_barbers ?? 'Ilimitados'} profissionais
                    </li>
                    <li className="flex items-center gap-1.5">
                      <Check className="h-3.5 w-3.5 text-[#45C486]" />
                      {plan.max_monthly_appointments ?? 'Ilimitados'} agendamentos/mês
                    </li>
                    <li className="flex items-center gap-1.5">
                      <Check className="h-3.5 w-3.5 text-[#45C486]" />
                      Até {plan.max_branches >= 999 ? 'ilimitadas' : plan.max_branches} unidade(s)
                    </li>
                  </ul>
                </div>

                <button
                  type="button"
                  disabled={isCurrent}
                  onClick={() => handleChangePlan(plan.code)}
                  className={`mt-5 flex items-center justify-center gap-2 rounded-lg py-2.5 text-xs font-bold ${
                    isCurrent
                      ? 'bg-white/10 text-[#B59E8D] cursor-default'
                      : 'bg-[#D49B6A] text-[#0E0906] hover:bg-[#E5B386]'
                  }`}
                >
                  <CreditCard className="h-3.5 w-3.5" />
                  <span>{isCurrent ? 'Plano Atual' : 'Selecionar Este Plano'}</span>
                </button>
              </div>
            );
          })}
        </div>

        <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-[#18100C] p-4 text-xs text-[#B59E8D]">
          <ShieldCheck className="h-4 w-4 text-[#45C486]" />
          <span>
            Mudanças de plano preservam integralmente clientes, histórico financeiro e configurações.
          </span>
        </div>
      </div>
    </PermissionGuard>
  );
}
