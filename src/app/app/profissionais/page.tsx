'use client';

import { useState } from 'react';
import Link from 'next/link';
import { AlertCircle, Star, UserPlus } from 'lucide-react';
import { useWorkspace } from '@/components/app/TenantWorkspaceContext';
import { PermissionGuard } from '@/components/app/PermissionGuard';
import { formatCurrencyBRL } from '@/lib/utils';

export default function BarbersPage() {
  const { data, selectedBranchId, refresh } = useWorkspace();
  const [name, setName] = useState('');
  const [specialty, setSpecialty] = useState('Corte & Barba');
  const [branchId, setBranchId] = useState('');
  const [commission, setCommission] = useState(50);
  const [goal, setGoal] = useState(5000);
  const [error, setError] = useState<string | null>(null);
  const [limitHit, setLimitHit] = useState(false);

  if (!data) return null;

  const visibleBarbers = data.barbers.filter(
    (b) => selectedBranchId === 'all' || b.branch_id === selectedBranchId
  );

  async function handleAddBarber(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLimitHit(false);

    const res = await fetch('/api/customers', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        kind: 'barber',
        tenantId: data!.tenant.id,
        branchId: branchId || data!.branches[0]?.id,
        name,
        specialty,
        defaultCommissionPercent: Number(commission),
        monthlyRevenueGoal: Number(goal),
      }),
    });
    const json = await res.json();
    if (!res.ok) {
      setError(json.error);
      if (res.status === 402) setLimitHit(true);
      return;
    }

    setName('');
    await refresh();
  }

  return (
    <PermissionGuard resource="barbers">
      <div className="space-y-6">
        <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
          <div>
            <h1 className="font-serif text-3xl font-semibold">Profissionais & Metas</h1>
            <p className="text-xs text-[#B59E8D]">
              Uso do plano: {data.barbers.length} /{' '}
              {data.plan.max_barbers === null ? 'Ilimitados' : data.plan.max_barbers} profissionais
              ({data.plan.name})
            </p>
          </div>
        </div>

        <form
          onSubmit={handleAddBarber}
          className="grid gap-3 rounded-xl border border-white/10 bg-[#18100C] p-4 sm:grid-cols-6 text-xs items-end"
        >
          <div>
            <label className="mb-1 block text-[#B59E8D]">Nome do Barbeiro</label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: Diego Martins"
              className="w-full rounded-lg border border-white/10 bg-[#0E0906] px-3 py-2"
            />
          </div>
          <div>
            <label className="mb-1 block text-[#B59E8D]">Especialidade</label>
            <input
              type="text"
              required
              value={specialty}
              onChange={(e) => setSpecialty(e.target.value)}
              className="w-full rounded-lg border border-white/10 bg-[#0E0906] px-3 py-2"
            />
          </div>
          <div>
            <label className="mb-1 block text-[#B59E8D]">Unidade</label>
            <select
              value={branchId || data.branches[0]?.id}
              onChange={(e) => setBranchId(e.target.value)}
              className="w-full rounded-lg border border-white/10 bg-[#0E0906] px-3 py-2"
            >
              {data.branches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-[#B59E8D]">Comissão (%)</label>
            <input
              type="number"
              min={0}
              max={100}
              value={commission}
              onChange={(e) => setCommission(Number(e.target.value))}
              className="w-full rounded-lg border border-white/10 bg-[#0E0906] px-3 py-2"
            />
          </div>
          <div>
            <label className="mb-1 block text-[#B59E8D]">Meta Mensal (R$)</label>
            <input
              type="number"
              min={0}
              value={goal}
              onChange={(e) => setGoal(Number(e.target.value))}
              className="w-full rounded-lg border border-white/10 bg-[#0E0906] px-3 py-2"
            />
          </div>
          <button
            type="submit"
            className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-[#D49B6A] py-2 font-bold text-[#0E0906]"
          >
            <UserPlus className="h-4 w-4" />
            <span>Cadastrar</span>
          </button>
        </form>

        {error && (
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[#E06258]/40 bg-[#E06258]/10 p-4 text-xs text-[#E06258]">
            <span className="flex items-center gap-2">
              <AlertCircle className="h-4 w-4 shrink-0" />
              {error}
            </span>
            {limitHit && (
              <Link
                href="/app/assinatura"
                className="rounded-lg bg-[#D49B6A] px-4 py-2 font-bold text-[#0E0906]"
              >
                Ver Planos & Fazer Upgrade
              </Link>
            )}
          </div>
        )}

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {visibleBarbers.map((barber) => {
            const prof = data.intelligence.barberProfitability.find(
              (p) => p.barberId === barber.id
            );
            const branch = data.branches.find((b) => b.id === barber.branch_id);
            return (
              <div
                key={barber.id}
                className="rounded-xl border border-white/10 bg-[#18100C] p-5 space-y-4"
              >
                <div className="flex items-center gap-3">
                  <img
                    src={barber.avatar_url}
                    alt={barber.name}
                    className="h-14 w-14 rounded-xl object-cover border border-[#D49B6A]/30"
                  />
                  <div>
                    <h3 className="text-sm font-bold text-[#F7EFE6]">{barber.name}</h3>
                    <p className="text-[11px] text-[#D49B6A]">{barber.specialty}</p>
                    <p className="mt-0.5 flex items-center gap-1 text-[11px] text-[#B59E8D]">
                      <Star className="h-3 w-3 fill-[#D49B6A] text-[#D49B6A]" />
                      {barber.rating_avg.toFixed(1)} ({barber.reviews_count})
                    </p>
                  </div>
                </div>

                <div className="space-y-1.5 text-xs border-t border-white/10 pt-3">
                  <div className="flex justify-between">
                    <span className="text-[#B59E8D]">Unidade</span>
                    <span>{branch?.name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#B59E8D]">Comissão padrão</span>
                    <span className="text-[#D49B6A]">{barber.default_commission_percent}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#B59E8D]">Produção realizada</span>
                    <span className="font-semibold text-[#45C486]">
                      {formatCurrencyBRL(prof?.grossRevenue ?? 0)}
                    </span>
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-[11px] text-[#B59E8D]">
                    <span>Meta: {formatCurrencyBRL(barber.monthly_revenue_goal)}</span>
                    <span>{prof?.goalProgressPercent ?? 0}%</span>
                  </div>
                  <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-[#0E0906]">
                    <div
                      className="h-full bg-[#D49B6A]"
                      style={{ width: `${prof?.goalProgressPercent ?? 0}%` }}
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </PermissionGuard>
  );
}
