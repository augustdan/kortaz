'use client';

import { useMemo, useState } from 'react';
import { CheckCircle2, Coins, Plus } from 'lucide-react';
import { useWorkspace } from '@/components/app/TenantWorkspaceContext';
import { PermissionGuard } from '@/components/app/PermissionGuard';
import { formatCurrencyBRL, formatDateTimeBR } from '@/lib/utils';

export default function CommissionsPage() {
  const { data, selectedBranchId, refresh, can } = useWorkspace();
  const [selectedBarberId, setSelectedBarberId] = useState('all');
  const [ruleBarberId, setRuleBarberId] = useState('');
  const [ruleServiceId, setRuleServiceId] = useState('');
  const [ruleScope, setRuleScope] = useState<'barber_service' | 'barber_default' | 'goal_bonus'>('barber_service');
  const [ruleType, setRuleType] = useState<'percentage' | 'fixed'>('percentage');
  const [ruleValue, setRuleValue] = useState(55);
  const [feedback, setFeedback] = useState<string | null>(null);

  const filtered = useMemo(() => {
    if (!data) return [];
    return data.commissions.filter((c) => {
      if (selectedBranchId !== 'all' && c.branch_id !== selectedBranchId) return false;
      if (selectedBarberId !== 'all' && c.barber_id !== selectedBarberId) return false;
      return true;
    });
  }, [data, selectedBranchId, selectedBarberId]);

  if (!data) return null;

  const totalPending = filtered
    .filter((c) => c.status === 'pending')
    .reduce((acc, c) => acc + c.final_amount, 0);
  const totalPaid = filtered
    .filter((c) => c.status === 'paid')
    .reduce((acc, c) => acc + c.final_amount, 0);

  async function handleCreateRule(e: React.FormEvent) {
    e.preventDefault();
    setFeedback(null);
    const res = await fetch('/api/commissions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'create_rule',
        tenantId: data!.tenant.id,
        barberId: ruleBarberId || data!.barbers[0]?.id,
        serviceId: ruleScope === 'barber_service' ? ruleServiceId || data!.services[0]?.id : null,
        ruleScope,
        commissionType: ruleType,
        value: Number(ruleValue),
        goalThreshold: ruleScope === 'goal_bonus' ? 5000 : undefined,
        bonusAmount: ruleScope === 'goal_bonus' ? Number(ruleValue) : undefined,
      }),
    });
    if (res.ok) {
      setFeedback(
        'Nova regra salva! Comissões já concluídas anteriormente permanecem intactas (snapshot histórico).'
      );
      await refresh();
    }
  }

  async function handleSettleCommissions() {
    setFeedback(null);
    const res = await fetch('/api/commissions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'pay_batch',
        tenantId: data!.tenant.id,
        barberId: selectedBarberId === 'all' ? undefined : selectedBarberId,
      }),
    });
    const json = await res.json();
    if (res.ok) {
      setFeedback(
        `Fechamento concluído: ${json.count} comissão(ões) paga(s) totalizando ${formatCurrencyBRL(json.totalPaid)}.`
      );
      await refresh();
    }
  }

  return (
    <PermissionGuard resource="commissions">
      <div className="space-y-6">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <h1 className="font-serif text-3xl font-semibold">Sistema de Comissões</h1>
            <p className="text-xs text-[#B59E8D]">
              Regras por porcentagem, valor fixo, serviço específico ou meta com histórico imutável.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <select
              value={selectedBarberId}
              onChange={(e) => setSelectedBarberId(e.target.value)}
              className="rounded-lg border border-white/10 bg-[#18100C] px-3 py-2 text-xs"
            >
              <option value="all">Todos os profissionais</option>
              {data.barbers.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>

            {can('commissions', 'can_edit') && totalPending > 0 && (
              <button
                type="button"
                onClick={handleSettleCommissions}
                className="inline-flex items-center gap-2 rounded-lg bg-[#45C486] px-4 py-2 text-xs font-bold text-[#0E0906]"
              >
                <CheckCircle2 className="h-4 w-4" />
                <span>Fechar & Pagar ({formatCurrencyBRL(totalPending)})</span>
              </button>
            )}
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <div className="rounded-xl border border-white/10 bg-[#18100C] p-4">
            <p className="text-xs text-[#B59E8D]">Comissões Pendentes</p>
            <p className="mt-1 text-2xl font-bold text-[#D49B6A]">
              {formatCurrencyBRL(totalPending)}
            </p>
          </div>
          <div className="rounded-xl border border-white/10 bg-[#18100C] p-4">
            <p className="text-xs text-[#B59E8D]">Comissões Pagas</p>
            <p className="mt-1 text-2xl font-bold text-[#45C486]">
              {formatCurrencyBRL(totalPaid)}
            </p>
          </div>
          <div className="rounded-xl border border-white/10 bg-[#18100C] p-4">
            <p className="text-xs text-[#B59E8D]">Regras Ativas</p>
            <p className="mt-1 text-2xl font-bold text-[#F7EFE6]">
              {data.commissionRules.length}
            </p>
          </div>
        </div>

        {can('commissions', 'can_edit') && (
          <form
            onSubmit={handleCreateRule}
            className="grid gap-3 rounded-xl border border-white/10 bg-[#18100C] p-4 sm:grid-cols-6 text-xs items-end"
          >
            <div>
              <label className="mb-1 block text-[#B59E8D]">Escopo da Regra</label>
              <select
                value={ruleScope}
                onChange={(e) =>
                  setRuleScope(e.target.value as 'barber_service' | 'barber_default' | 'goal_bonus')
                }
                className="w-full rounded-lg border border-white/10 bg-[#0E0906] px-2.5 py-2"
              >
                <option value="barber_service">Barbeiro + Serviço</option>
                <option value="barber_default">Padrão do Barbeiro</option>
                <option value="goal_bonus">Bônus por Meta (R$ 5k)</option>
              </select>
            </div>
            <div>
              <label className="mb-1 block text-[#B59E8D]">Barbeiro</label>
              <select
                value={ruleBarberId || data.barbers[0]?.id}
                onChange={(e) => setRuleBarberId(e.target.value)}
                className="w-full rounded-lg border border-white/10 bg-[#0E0906] px-2.5 py-2"
              >
                {data.barbers.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-[#B59E8D]">Serviço</label>
              <select
                disabled={ruleScope !== 'barber_service'}
                value={ruleServiceId || data.services[0]?.id}
                onChange={(e) => setRuleServiceId(e.target.value)}
                className="w-full rounded-lg border border-white/10 bg-[#0E0906] px-2.5 py-2 disabled:opacity-40"
              >
                {data.services.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-[#B59E8D]">Tipo</label>
              <select
                value={ruleType}
                onChange={(e) => setRuleType(e.target.value as 'percentage' | 'fixed')}
                className="w-full rounded-lg border border-white/10 bg-[#0E0906] px-2.5 py-2"
              >
                <option value="percentage">Percentual (%)</option>
                <option value="fixed">Valor Fixo (R$)</option>
              </select>
            </div>
            <div>
              <label className="mb-1 block text-[#B59E8D]">Valor</label>
              <input
                type="number"
                step="0.01"
                value={ruleValue}
                onChange={(e) => setRuleValue(Number(e.target.value))}
                className="w-full rounded-lg border border-white/10 bg-[#0E0906] px-3 py-2"
              />
            </div>
            <button
              type="submit"
              className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-[#D49B6A] py-2 font-bold text-[#0E0906]"
            >
              <Plus className="h-4 w-4" />
              <span>Criar Regra</span>
            </button>
          </form>
        )}

        {feedback && (
          <div className="rounded-lg border border-[#D49B6A]/40 bg-[#D49B6A]/10 p-3 text-xs text-[#D49B6A]">
            {feedback}
          </div>
        )}

        {/* Extrato de Comissões */}
        <div className="overflow-x-auto rounded-xl border border-white/10 bg-[#18100C] p-5">
          <h2 className="mb-4 flex items-center gap-2 text-sm font-semibold">
            <Coins className="h-4 w-4 text-[#D49B6A]" /> Extrato Individual de Comissões
          </h2>
          <table className="w-full text-left text-xs">
            <thead className="border-b border-white/10 text-[#B59E8D]">
              <tr>
                <th className="py-2 pr-4">Data</th>
                <th className="py-2 pr-4">Profissional</th>
                <th className="py-2 pr-4">Referência</th>
                <th className="py-2 pr-4">Base Bruta</th>
                <th className="py-2 pr-4">Regra Aplicada (Snapshot)</th>
                <th className="py-2 pr-4">Comissão</th>
                <th className="py-2">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {filtered.map((c) => (
                <tr key={c.id}>
                  <td className="py-3 pr-4 text-[#B59E8D]">{formatDateTimeBR(c.created_at)}</td>
                  <td className="py-3 pr-4 font-semibold text-[#F7EFE6]">
                    {data.barbers.find((b) => b.id === c.barber_id)?.name}
                  </td>
                  <td className="py-3 pr-4">{c.reference_label}</td>
                  <td className="py-3 pr-4">{formatCurrencyBRL(c.gross_base_amount)}</td>
                  <td className="py-3 pr-4 text-[#B59E8D]">
                    {c.applied_rule_type === 'percentage'
                      ? `${c.applied_rule_value}%`
                      : `Fixo ${formatCurrencyBRL(c.applied_rule_value)}`}
                  </td>
                  <td className="py-3 pr-4 font-bold text-[#D49B6A]">
                    {formatCurrencyBRL(c.final_amount)}
                  </td>
                  <td className="py-3">
                    <span
                      className={`rounded px-2 py-0.5 text-[10px] font-bold uppercase ${
                        c.status === 'paid'
                          ? 'bg-[#45C486]/15 text-[#45C486]'
                          : 'bg-[#D49B6A]/15 text-[#D49B6A]'
                      }`}
                    >
                      {c.status === 'paid' ? 'Pago' : 'Pendente'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </PermissionGuard>
  );
}
