'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  Award,
  Calendar,
  CheckCircle2,
  Clock,
  Phone,
  Scissors,
  XCircle,
} from 'lucide-react';
import { BrandLogo } from '@/components/ui/BrandLogo';
import { Badge, type BadgeVariant } from '@/components/ui/Badge';
import { ConfirmationDialog } from '@/components/ui/Modal';
import { formatCurrencyBRL, formatDateTimeBR } from '@/lib/utils';

interface PortalAppointment {
  id: string;
  starts_at: string;
  ends_at: string;
  status: string;
  total_amount: number;
  barberName: string;
  branchName: string;
  services: string[];
}

interface PortalResponse {
  tenant: { id: string; name: string; slug: string };
  customer: {
    id: string;
    full_name: string;
    phone: string;
    visits_count: number;
    total_spent: number;
  };
  loyalty: {
    points_balance: number;
    stamps_balance: number;
    cashback_balance: number;
  };
  appointments: PortalAppointment[];
}

const STATUS_MAP: Record<string, { label: string; variant: BadgeVariant }> = {
  confirmed: { label: 'Confirmado', variant: 'success' },
  pending: { label: 'Pendente', variant: 'warning' },
  in_progress: { label: 'Em atendimento', variant: 'info' },
  completed: { label: 'Concluído', variant: 'purple' },
  cancelled: { label: 'Cancelado', variant: 'danger' },
  no_show: { label: 'Não compareceu', variant: 'danger' },
};

export default function ClientPortalPage() {
  const [slug, setSlug] = useState('barbearia-exclusiva');
  const [phone, setPhone] = useState('');

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const paramSlug = new URLSearchParams(window.location.search).get('slug');
    if (paramSlug) setSlug(paramSlug);
  }, []);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [portal, setPortal] = useState<PortalResponse | null>(null);
  const [cancelTarget, setCancelTarget] = useState<PortalAppointment | null>(null);
  const [cancelling, setCancelling] = useState(false);

  async function handleSearch(e?: React.FormEvent) {
    if (e) e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const qs = new URLSearchParams({ slug: slug.trim() || 'barbearia-exclusiva', phone: phone.trim() });
      const res = await fetch(`/api/public/customer-portal?${qs.toString()}`);
      const json = await res.json();
      if (!res.ok) {
        setError(json.error || 'Não foi possível localizar seus agendamentos.');
        setPortal(null);
        return;
      }
      setPortal(json as PortalResponse);
    } catch {
      setError('Erro de conexão ao consultar seus horários.');
    } finally {
      setLoading(false);
    }
  }

  async function confirmCancel() {
    if (!cancelTarget || !portal) return;
    setCancelling(true);
    try {
      const res = await fetch('/api/public/customer-portal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'cancel',
          slug: portal.tenant.slug,
          phone,
          appointmentId: cancelTarget.id,
        }),
      });
      if (res.ok) {
        setCancelTarget(null);
        await handleSearch();
      }
    } finally {
      setCancelling(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#090909] text-[#F5F1EB]">
      <header className="border-b border-[#292521] bg-[#0C0C0C]">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-4 py-4 sm:px-6">
          <BrandLogo subtitle="ÁREA DO CLIENTE" />
          <Link
            href={portal ? `/agendar/${portal.tenant.slug}` : `/agendar/${slug}`}
            className="inline-flex items-center gap-1.5 rounded-xl bg-[#D99A4E] px-4 py-2 text-xs font-bold text-[#090909] hover:bg-[#F2B968]"
          >
            <Calendar className="h-3.5 w-3.5" />
            Novo agendamento
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-4xl space-y-6 px-4 py-8 sm:px-6">
        <div className="rounded-2xl border border-[#292521] bg-[#151515] p-6">
          <h1 className="font-display text-2xl font-bold text-[#F5F1EB]">
            Meus Agendamentos &amp; Fidelidade
          </h1>
          <p className="mt-1 text-xs text-[#A5A09A]">
            Consulte seus horários marcados, pontos de fidelidade e histórico usando seu WhatsApp.
          </p>

          <form onSubmit={handleSearch} className="mt-5 grid gap-3 sm:grid-cols-12">
            <div className="sm:col-span-4">
              <label className="mb-1 block text-[11px] font-medium text-[#A5A09A]">
                Estabelecimento (slug)
              </label>
              <input
                value={slug}
                onChange={(e) => setSlug(e.target.value)}
                placeholder="barbearia-exclusiva"
                className="h-11 w-full rounded-xl border border-[#292521] bg-[#090909] px-3.5 text-xs text-[#F5F1EB] focus:border-[#D99A4E] focus:outline-none"
              />
            </div>
            <div className="sm:col-span-5">
              <label className="mb-1 block text-[11px] font-medium text-[#A5A09A]">
                Seu WhatsApp
              </label>
              <div className="relative">
                <Phone className="pointer-events-none absolute left-3.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#A5A09A]" />
                <input
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="(11) 99999-9999"
                  className="h-11 w-full rounded-xl border border-[#292521] bg-[#090909] pl-9 pr-3.5 text-xs text-[#F5F1EB] focus:border-[#D99A4E] focus:outline-none"
                />
              </div>
            </div>
            <div className="flex items-end sm:col-span-3">
              <button
                type="submit"
                disabled={loading}
                className="h-11 w-full rounded-xl bg-[#D99A4E] text-xs font-bold text-[#090909] hover:bg-[#F2B968] disabled:opacity-50"
              >
                {loading ? 'Buscando...' : 'Consultar'}
              </button>
            </div>
          </form>

          {error && (
            <p className="mt-4 rounded-xl border border-[#EF5350]/30 bg-[#EF5350]/10 px-4 py-2.5 text-xs text-[#EF5350]">
              {error}
            </p>
          )}
        </div>

        {portal && (
          <>
            {/* Resumo do Cliente & Fidelidade */}
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="rounded-2xl border border-[#292521] bg-[#151515] p-5">
                <p className="text-[11px] text-[#A5A09A]">Cliente</p>
                <p className="mt-1 font-display text-lg font-bold text-[#F5F1EB]">
                  {portal.customer.full_name}
                </p>
                <p className="mt-0.5 text-xs text-[#D99A4E]">{portal.tenant.name}</p>
              </div>
              <div className="rounded-2xl border border-[#292521] bg-[#151515] p-5">
                <div className="flex items-center justify-between">
                  <p className="text-[11px] text-[#A5A09A]">Pontos de Fidelidade</p>
                  <Award className="h-4 w-4 text-[#F2B968]" />
                </div>
                <p className="mt-1 font-display text-2xl font-bold text-[#F2B968]">
                  {portal.loyalty.points_balance} pts
                </p>
                <p className="mt-0.5 text-[11px] text-[#A5A09A]">
                  Selos: {portal.loyalty.stamps_balance} · Cashback:{' '}
                  {formatCurrencyBRL(portal.loyalty.cashback_balance)}
                </p>
              </div>
              <div className="rounded-2xl border border-[#292521] bg-[#151515] p-5">
                <div className="flex items-center justify-between">
                  <p className="text-[11px] text-[#A5A09A]">Visitas realizadas</p>
                  <CheckCircle2 className="h-4 w-4 text-[#16C784]" />
                </div>
                <p className="mt-1 font-display text-2xl font-bold text-[#F5F1EB]">
                  {portal.customer.visits_count}
                </p>
                <p className="mt-0.5 text-[11px] text-[#A5A09A]">
                  Total investido: {formatCurrencyBRL(portal.customer.total_spent)}
                </p>
              </div>
            </div>

            {/* Lista de Agendamentos */}
            <div className="rounded-2xl border border-[#292521] bg-[#151515] p-5">
              <h2 className="font-display text-base font-bold text-[#F5F1EB]">
                Seus Agendamentos ({portal.appointments.length})
              </h2>

              <div className="mt-4 space-y-3">
                {portal.appointments.length === 0 ? (
                  <p className="py-6 text-center text-xs text-[#A5A09A]">
                    Você ainda não possui agendamentos neste estabelecimento.
                  </p>
                ) : (
                  portal.appointments.map((appt) => {
                    const st = STATUS_MAP[appt.status] || {
                      label: appt.status,
                      variant: 'neutral' as BadgeVariant,
                    };
                    const canCancel = appt.status === 'pending' || appt.status === 'confirmed';

                    return (
                      <div
                        key={appt.id}
                        className="flex flex-col justify-between gap-3 rounded-xl border border-[#292521] bg-[#1B1B1B] p-4 sm:flex-row sm:items-center"
                      >
                        <div className="space-y-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="inline-flex items-center gap-1.5 text-xs font-bold text-[#F5F1EB]">
                              <Clock className="h-3.5 w-3.5 text-[#D99A4E]" />
                              {formatDateTimeBR(appt.starts_at)}
                            </span>
                            <Badge variant={st.variant}>{st.label}</Badge>
                          </div>
                          <p className="flex items-center gap-1.5 text-xs text-[#A5A09A]">
                            <Scissors className="h-3 w-3 text-[#D99A4E]" />
                            {appt.services.join(' + ')} · {appt.barberName} ({appt.branchName})
                          </p>
                        </div>

                        <div className="flex items-center gap-3">
                          <span className="font-display text-sm font-bold text-[#F2B968]">
                            {formatCurrencyBRL(appt.total_amount)}
                          </span>
                          {canCancel && (
                            <button
                              type="button"
                              onClick={() => setCancelTarget(appt)}
                              className="inline-flex items-center gap-1 rounded-lg border border-[#EF5350]/35 bg-[#EF5350]/10 px-3 py-1.5 text-[11px] font-semibold text-[#EF5350] hover:bg-[#EF5350]/20"
                            >
                              <XCircle className="h-3.5 w-3.5" />
                              Cancelar
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </>
        )}

        <div className="text-center">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-xs font-medium text-[#A5A09A] hover:text-[#F5F1EB]"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Voltar para o início
          </Link>
        </div>
      </main>

      <ConfirmationDialog
        open={Boolean(cancelTarget)}
        onClose={() => setCancelTarget(null)}
        onConfirm={confirmCancel}
        loading={cancelling}
        title="Cancelar agendamento?"
        description="Tem certeza que deseja cancelar este horário? O horário ficará livre novamente na agenda do profissional."
        confirmLabel="Sim, cancelar horário"
      />
    </div>
  );
}
