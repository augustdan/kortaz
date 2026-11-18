'use client';

import { useMemo, useState } from 'react';
import { Download, Printer, RefreshCcw, Wallet } from 'lucide-react';
import { useWorkspace } from '@/components/app/TenantWorkspaceContext';
import { PermissionGuard } from '@/components/app/PermissionGuard';
import { exportRowsToCsv, formatCurrencyBRL, formatDateTimeBR } from '@/lib/utils';

export default function FinancialPage() {
  const { data, selectedBranchId, refresh } = useWorkspace();
  const [cashAction, setCashAction] = useState<'bleed' | 'supply' | 'expense' | 'open' | 'close'>('supply');
  const [amount, setAmount] = useState(100);
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('Insumos');
  const [feedback, setFeedback] = useState<string | null>(null);

  const summary = useMemo(() => {
    if (!data) return null;
    const branchMatch = (bId: string) => selectedBranchId === 'all' || bId === selectedBranchId;

    const payments = data.payments.filter((p) => branchMatch(p.branch_id));
    const approved = payments.filter((p) => p.status === 'approved' || p.status === 'partially_refunded');

    const grossRevenue = approved.reduce((acc, p) => acc + p.gross_amount, 0);
    const providerFees = approved.reduce((acc, p) => acc + p.provider_fee, 0);
    const refundsTotal = payments.reduce((acc, p) => acc + p.refunded_amount, 0);
    const commissionsTotal = data.commissions
      .filter((c) => branchMatch(c.branch_id) && c.status !== 'cancelled')
      .reduce((acc, c) => acc + c.final_amount, 0);
    const paidExpenses = data.expenses
      .filter((e) => branchMatch(e.branch_id) && e.entry_kind === 'payable' && e.status === 'paid')
      .reduce((acc, e) => acc + e.amount, 0);

    const netOperatingRevenue = grossRevenue - providerFees - refundsTotal - commissionsTotal - paidExpenses;

    const openRegister = data.cashRegisters.find(
      (r) => branchMatch(r.branch_id) && r.status === 'open'
    );

    return {
      payments,
      grossRevenue,
      providerFees,
      refundsTotal,
      commissionsTotal,
      paidExpenses,
      netOperatingRevenue,
      openRegister,
    };
  }, [data, selectedBranchId]);

  if (!data || !summary) return null;

  async function handleCashAction(e: React.FormEvent) {
    e.preventDefault();
    setFeedback(null);
    const targetBranch =
      selectedBranchId === 'all' ? data!.branches[0]?.id : selectedBranchId;

    const res = await fetch('/api/cash-register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: cashAction,
        tenantId: data!.tenant.id,
        branchId: targetBranch,
        amount: Number(amount),
        description: description || undefined,
        category,
      }),
    });
    const json = await res.json();
    if (!res.ok) {
      setFeedback(json.error);
      return;
    }
    setDescription('');
    setFeedback('Lançamento financeiro registrado no caixa.');
    await refresh();
  }

  async function handleRefund(paymentId: string, maxAmount: number) {
    setFeedback(null);
    const res = await fetch('/api/payments/checkout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'refund',
        tenantId: data!.tenant.id,
        paymentId,
        amount: maxAmount,
        reason: 'Estorno operacional solicitado no painel',
      }),
    });
    const json = await res.json();
    setFeedback(res.ok ? 'Estorno processado com sucesso!' : json.error);
    await refresh();
  }

  async function handlePayExpense(expenseId: string) {
    await fetch('/api/cash-register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'pay_expense',
        tenantId: data!.tenant.id,
        expenseId,
      }),
    });
    await refresh();
  }

  function handleExportCsv() {
    exportRowsToCsv(
      `financeiro-${data!.tenant.slug}.csv`,
      ['ID', 'Data', 'Método', 'Provedor', 'Bruto', 'Taxas', 'Estornos', 'Líquido', 'Status'],
      summary!.payments.map((p) => [
        p.id,
        p.created_at,
        p.method,
        p.provider,
        p.gross_amount.toFixed(2),
        p.provider_fee.toFixed(2),
        p.refunded_amount.toFixed(2),
        p.net_amount.toFixed(2),
        p.status,
      ])
    );
  }

  return (
    <PermissionGuard resource="financial">
      <div className="space-y-6">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <h1 className="font-serif text-3xl font-semibold">Financeiro & Fluxo de Caixa</h1>
            <p className="text-xs text-[#B59E8D]">
              Transparência total entre faturamento bruto, taxas de gateway, estornos, comissões e lucro líquido.
            </p>
          </div>

          <div className="no-print flex flex-wrap gap-2">
            <button
              type="button"
              onClick={handleExportCsv}
              className="inline-flex items-center gap-2 rounded-lg border border-white/15 bg-[#18100C] px-4 py-2 text-xs font-semibold hover:border-[#D49B6A]"
            >
              <Download className="h-4 w-4 text-[#D49B6A]" />
              <span>Exportar CSV</span>
            </button>
            <button
              type="button"
              onClick={() => window.print()}
              className="inline-flex items-center gap-2 rounded-lg bg-[#D49B6A] px-4 py-2 text-xs font-bold text-[#0E0906]"
            >
              <Printer className="h-4 w-4" />
              <span>Imprimir / PDF</span>
            </button>
          </div>
        </div>

        {/* Separação clara de métricas financeiras */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {[
            { label: 'Faturamento Bruto', val: summary.grossRevenue, color: 'text-[#F7EFE6]' },
            { label: 'Taxas Provedor (MP)', val: -summary.providerFees, color: 'text-[#B59E8D]' },
            { label: 'Estornos', val: -summary.refundsTotal, color: 'text-[#E06258]' },
            { label: 'Repasses (Comissões)', val: -summary.commissionsTotal, color: 'text-[#D49B6A]' },
            { label: 'Receita Líquida Estimada', val: summary.netOperatingRevenue, color: 'text-[#45C486]' },
          ].map((card) => (
            <div key={card.label} className="rounded-xl border border-white/10 bg-[#18100C] p-4">
              <p className="text-xs text-[#B59E8D]">{card.label}</p>
              <p className={`mt-1.5 text-xl font-bold ${card.color}`}>
                {formatCurrencyBRL(card.val)}
              </p>
            </div>
          ))}
        </div>

        {/* Caixa Atual & Ações (Abertura, Fechamento, Sangria, Suprimento, Despesa) */}
        <div className="grid gap-6 lg:grid-cols-12">
          <div className="rounded-xl border border-white/10 bg-[#18100C] p-5 lg:col-span-4 space-y-4">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-2 text-sm font-semibold">
                <Wallet className="h-4 w-4 text-[#D49B6A]" /> Caixa da Unidade
              </span>
              <span
                className={`rounded px-2 py-0.5 text-[10px] font-bold uppercase ${
                  summary.openRegister
                    ? 'bg-[#45C486]/15 text-[#45C486]'
                    : 'bg-[#E06258]/15 text-[#E06258]'
                }`}
              >
                {summary.openRegister ? 'Aberto' : 'Fechado'}
              </span>
            </div>

            {summary.openRegister && (
              <div className="rounded-lg bg-[#0E0906] p-3 text-xs space-y-1">
                <div className="flex justify-between">
                  <span className="text-[#B59E8D]">Saldo inicial</span>
                  <span>{formatCurrencyBRL(summary.openRegister.opening_balance)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#B59E8D]">Saldo esperado</span>
                  <strong className="text-[#D49B6A]">
                    {formatCurrencyBRL(summary.openRegister.expected_closing_balance)}
                  </strong>
                </div>
              </div>
            )}

            <form onSubmit={handleCashAction} className="space-y-3 text-xs">
              <select
                value={cashAction}
                onChange={(e) =>
                  setCashAction(
                    e.target.value as 'bleed' | 'supply' | 'expense' | 'open' | 'close'
                  )
                }
                className="w-full rounded-lg border border-white/10 bg-[#0E0906] px-3 py-2"
              >
                <option value="supply">Suprimento (Entrada)</option>
                <option value="bleed">Sangria (Retirada)</option>
                <option value="expense">Lançar Conta a Pagar / Despesa</option>
                <option value="open">Abrir Caixa</option>
                <option value="close">Fechar Caixa</option>
              </select>
              <input
                type="number"
                step="0.01"
                min="0"
                required
                value={amount}
                onChange={(e) => setAmount(Number(e.target.value))}
                placeholder="Valor (R$)"
                className="w-full rounded-lg border border-white/10 bg-[#0E0906] px-3 py-2"
              />
              {cashAction === 'expense' && (
                <input
                  type="text"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  placeholder="Categoria (ex: Aluguel, Energia)"
                  className="w-full rounded-lg border border-white/10 bg-[#0E0906] px-3 py-2"
                />
              )}
              <input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Descrição do lançamento"
                className="w-full rounded-lg border border-white/10 bg-[#0E0906] px-3 py-2"
              />
              <button
                type="submit"
                className="w-full rounded-lg bg-[#D49B6A] py-2.5 font-bold text-[#0E0906]"
              >
                Registrar Movimentação
              </button>
              {feedback && <p className="text-[#D49B6A]">{feedback}</p>}
            </form>
          </div>

          {/* Contas a Pagar e Receber */}
          <div className="rounded-xl border border-white/10 bg-[#18100C] p-5 lg:col-span-8">
            <h2 className="text-sm font-semibold text-[#F7EFE6]">Contas a Pagar & Despesas</h2>
            <div className="mt-4 space-y-2 text-xs">
              {data.expenses.map((exp) => (
                <div
                  key={exp.id}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-white/5 bg-[#0E0906] p-3"
                >
                  <div>
                    <p className="font-semibold text-[#F7EFE6]">{exp.description}</p>
                    <p className="text-[#B59E8D]">
                      {exp.category} &bull; Vencimento: {exp.due_date.split('-').reverse().join('/')}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-bold text-[#F7EFE6]">{formatCurrencyBRL(exp.amount)}</span>
                    {exp.status === 'pending' ? (
                      <button
                        type="button"
                        onClick={() => handlePayExpense(exp.id)}
                        className="rounded bg-[#45C486] px-2.5 py-1 font-bold text-[#0E0906]"
                      >
                        Dar Baixa
                      </button>
                    ) : (
                      <span className="rounded bg-[#45C486]/15 px-2 py-0.5 text-[10px] uppercase text-[#45C486]">
                        {exp.status}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Histórico de Pagamentos e Estornos */}
        <div className="overflow-x-auto rounded-xl border border-white/10 bg-[#18100C] p-5">
          <h2 className="mb-4 text-sm font-semibold">Transações & Pagamentos</h2>
          <table className="w-full text-left text-xs">
            <thead className="border-b border-white/10 text-[#B59E8D]">
              <tr>
                <th className="py-2 pr-4">Data</th>
                <th className="py-2 pr-4">Método / Provedor</th>
                <th className="py-2 pr-4">Bruto</th>
                <th className="py-2 pr-4">Taxas</th>
                <th className="py-2 pr-4">Líquido</th>
                <th className="py-2 pr-4">Status</th>
                <th className="py-2 text-right">Ação</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {summary.payments.map((p) => (
                <tr key={p.id}>
                  <td className="py-3 pr-4 text-[#B59E8D]">{formatDateTimeBR(p.created_at)}</td>
                  <td className="py-3 pr-4">
                    <span className="uppercase">{p.method}</span> ({p.provider})
                  </td>
                  <td className="py-3 pr-4">{formatCurrencyBRL(p.gross_amount)}</td>
                  <td className="py-3 pr-4 text-[#B59E8D]">{formatCurrencyBRL(p.provider_fee)}</td>
                  <td className="py-3 pr-4 font-bold text-[#45C486]">
                    {formatCurrencyBRL(p.net_amount)}
                  </td>
                  <td className="py-3 pr-4">
                    <span className="rounded bg-[#0E0906] px-2 py-0.5 text-[10px] uppercase text-[#D49B6A]">
                      {p.status}
                    </span>
                  </td>
                  <td className="py-3 text-right">
                    {p.status === 'approved' && p.gross_amount - p.refunded_amount > 0 && (
                      <button
                        type="button"
                        onClick={() => handleRefund(p.id, p.gross_amount - p.refunded_amount)}
                        className="inline-flex items-center gap-1 rounded border border-[#E06258]/40 px-2.5 py-1 text-[11px] text-[#E06258]"
                      >
                        <RefreshCcw className="h-3 w-3" /> Estornar
                      </button>
                    )}
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
