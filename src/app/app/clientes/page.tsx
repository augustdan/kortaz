'use client';

import { useMemo, useState } from 'react';
import { MessageSquare, Search, UserPlus } from 'lucide-react';
import { useWorkspace } from '@/components/app/TenantWorkspaceContext';
import { PermissionGuard } from '@/components/app/PermissionGuard';
import { classifyCustomer, type CustomerSegment } from '@/lib/domain/intelligence';
import { formatCurrencyBRL, formatDateBR } from '@/lib/utils';

const SEGMENT_LABELS: Record<CustomerSegment, string> = {
  vip: 'VIP',
  frequent: 'Frequente',
  new: 'Novo',
  inactive: 'Inativo 45d+',
  birthday: 'Aniversariante',
  high_cancel_risk: 'Risco Falta/Canc.',
};

export default function CustomersCrmPage() {
  const { data, selectedBranchId, refresh } = useWorkspace();
  const [segmentFilter, setSegmentFilter] = useState<CustomerSegment | 'all'>('all');
  const [search, setSearch] = useState('');
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [notes, setNotes] = useState('');
  const [statusMsg, setStatusMsg] = useState<string | null>(null);

  const classified = useMemo(() => {
    if (!data) return [];
    return data.customers
      .filter((c) => selectedBranchId === 'all' || !c.branch_id || c.branch_id === selectedBranchId)
      .map((c) => classifyCustomer(c, data.settings))
      .filter((item) => {
        if (segmentFilter !== 'all' && !item.segments.includes(segmentFilter)) return false;
        if (search.trim()) {
          const q = search.toLowerCase();
          return (
            item.customer.full_name.toLowerCase().includes(q) ||
            item.customer.phone.toLowerCase().includes(q)
          );
        }
        return true;
      });
  }, [data, selectedBranchId, segmentFilter, search]);

  if (!data) return null;

  async function handleCreateCustomer(e: React.FormEvent) {
    e.preventDefault();
    setStatusMsg(null);
    const res = await fetch('/api/customers', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        tenantId: data!.tenant.id,
        branchId: selectedBranchId === 'all' ? data!.branches[0]?.id : selectedBranchId,
        fullName,
        phone,
        email,
        birthDate: birthDate || undefined,
        notes,
        marketingOptIn: true,
        whatsappOptIn: true,
      }),
    });
    const json = await res.json();
    if (!res.ok) {
      setStatusMsg(json.error);
      return;
    }
    setFullName('');
    setPhone('');
    setEmail('');
    setNotes('');
    setStatusMsg('Cliente cadastrado no CRM e conta de fidelidade criada!');
    await refresh();
  }

  async function handleRecoverInactive(customerId: string) {
    setStatusMsg(null);
    const res = await fetch('/api/customers', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        kind: 'recover_inactive',
        tenantId: data!.tenant.id,
        customerId,
      }),
    });
    const json = await res.json();
    if (!res.ok) {
      setStatusMsg(json.error);
      return;
    }
    const job = json.job;
    setStatusMsg(
      job?.status === 'sent'
        ? 'Campanha de recuperação enviada via WhatsApp Business API!'
        : `Mensagem enfileirada (${job?.status}): ${job?.last_error || 'Aguardando credenciais WhatsApp.'}`
    );
    await refresh();
  }

  return (
    <PermissionGuard resource="customers">
      <div className="space-y-6">
        <div>
          <h1 className="font-serif text-3xl font-semibold">CRM & Segmentação de Clientes</h1>
          <p className="text-xs text-[#B59E8D]">
            Histórico completo, segmentação inteligente e recuperação de clientes inativos conforme LGPD.
          </p>
        </div>

        {/* Cadastro rápido */}
        <form
          onSubmit={handleCreateCustomer}
          className="grid gap-3 rounded-xl border border-white/10 bg-[#18100C] p-4 sm:grid-cols-6 text-xs"
        >
          <input
            type="text"
            required
            placeholder="Nome completo"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            className="rounded-lg border border-white/10 bg-[#0E0906] px-3 py-2"
          />
          <input
            type="tel"
            required
            placeholder="WhatsApp"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className="rounded-lg border border-white/10 bg-[#0E0906] px-3 py-2"
          />
          <input
            type="email"
            placeholder="E-mail"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="rounded-lg border border-white/10 bg-[#0E0906] px-3 py-2"
          />
          <input
            type="date"
            title="Data de nascimento"
            value={birthDate}
            onChange={(e) => setBirthDate(e.target.value)}
            className="rounded-lg border border-white/10 bg-[#0E0906] px-3 py-2"
          />
          <input
            type="text"
            placeholder="Preferências / Observações"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="rounded-lg border border-white/10 bg-[#0E0906] px-3 py-2"
          />
          <button
            type="submit"
            className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-[#D49B6A] py-2 font-bold text-[#0E0906]"
          >
            <UserPlus className="h-4 w-4" />
            <span>Adicionar</span>
          </button>
        </form>

        {statusMsg && (
          <div className="rounded-lg border border-[#D49B6A]/40 bg-[#D49B6A]/10 p-3 text-xs text-[#D49B6A]">
            {statusMsg}
          </div>
        )}

        {/* Filtros de Segmento + Busca */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap gap-2 text-xs">
            <button
              type="button"
              onClick={() => setSegmentFilter('all')}
              className={`rounded-full border px-3 py-1 ${
                segmentFilter === 'all'
                  ? 'border-[#D49B6A] bg-[#D49B6A] font-bold text-[#0E0906]'
                  : 'border-white/10 bg-[#18100C] text-[#B59E8D]'
              }`}
            >
              Todos
            </button>
            {(Object.keys(SEGMENT_LABELS) as CustomerSegment[]).map((seg) => (
              <button
                key={seg}
                type="button"
                onClick={() => setSegmentFilter(seg)}
                className={`rounded-full border px-3 py-1 ${
                  segmentFilter === seg
                    ? 'border-[#D49B6A] bg-[#D49B6A] font-bold text-[#0E0906]'
                    : 'border-white/10 bg-[#18100C] text-[#B59E8D]'
                }`}
              >
                {SEGMENT_LABELS[seg]}
              </button>
            ))}
          </div>

          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-[#B59E8D]" />
            <input
              type="text"
              placeholder="Buscar nome ou telefone..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-lg border border-white/10 bg-[#18100C] py-2 pl-9 pr-3 text-xs"
            />
          </div>
        </div>

        {/* Cards de Clientes */}
        <div className="grid gap-4 md:grid-cols-2">
          {classified.map(({ customer, segments, daysSinceLastVisit, recommendedOffer }) => {
            const loyalty = data.loyaltyAccounts.find((l) => l.customer_id === customer.id);
            return (
              <div
                key={customer.id}
                className="rounded-xl border border-white/10 bg-[#18100C] p-5 space-y-3"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h3 className="text-base font-bold text-[#F7EFE6]">{customer.full_name}</h3>
                    <p className="text-xs text-[#B59E8D]">
                      {customer.phone} {customer.email ? `• ${customer.email}` : ''}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-[#D49B6A]">
                      {formatCurrencyBRL(customer.total_spent)}
                    </p>
                    <p className="text-[11px] text-[#B59E8D]">
                      {customer.visits_count} visita(s)
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap gap-1.5">
                  {segments.map((s) => (
                    <span
                      key={s}
                      className={`rounded px-2 py-0.5 text-[10px] font-semibold uppercase ${
                        s === 'high_cancel_risk' || s === 'inactive'
                          ? 'bg-[#E06258]/15 text-[#E06258]'
                          : 'bg-[#D49B6A]/15 text-[#D49B6A]'
                      }`}
                    >
                      {SEGMENT_LABELS[s]}
                    </span>
                  ))}
                  {!customer.whatsapp_opt_in && (
                    <span className="rounded bg-white/10 px-2 py-0.5 text-[10px] text-[#B59E8D]">
                      Opt-out LGPD
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-3 gap-2 rounded-lg bg-[#0E0906] p-2.5 text-[11px]">
                  <div>
                    <span className="block text-[#B59E8D]">Última visita</span>
                    <strong className="text-[#F7EFE6]">
                      {customer.last_visit_at
                        ? `${formatDateBR(customer.last_visit_at)} (${daysSinceLastVisit}d)`
                        : 'Sem visitas'}
                    </strong>
                  </div>
                  <div>
                    <span className="block text-[#B59E8D]">Cartão Fidelidade</span>
                    <strong className="text-[#D49B6A]">
                      {loyalty?.stamps_balance ?? 0}/{data.settings.loyalty_cuts_target} selos
                    </strong>
                  </div>
                  <div>
                    <span className="block text-[#B59E8D]">Cashback</span>
                    <strong className="text-[#45C486]">
                      {formatCurrencyBRL(loyalty?.cashback_balance ?? 0)}
                    </strong>
                  </div>
                </div>

                {customer.notes && (
                  <p className="text-xs italic text-[#B59E8D]">&ldquo;{customer.notes}&rdquo;</p>
                )}

                {recommendedOffer && (
                  <div className="flex items-center justify-between gap-2 rounded-lg border border-[#D49B6A]/30 bg-[#D49B6A]/10 p-2.5 text-xs">
                    <span className="text-[#F7EFE6]">{recommendedOffer}</span>
                    <button
                      type="button"
                      onClick={() => handleRecoverInactive(customer.id)}
                      className="inline-flex shrink-0 items-center gap-1 rounded bg-[#D49B6A] px-2.5 py-1.5 text-[11px] font-bold text-[#0E0906]"
                    >
                      <MessageSquare className="h-3.5 w-3.5" />
                      <span>Recuperar</span>
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </PermissionGuard>
  );
}
