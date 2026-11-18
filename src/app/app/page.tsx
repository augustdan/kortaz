'use client';

import { useMemo, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import {
  ArrowRight,
  BarChart3,
  Calendar,
  CalendarPlus,
  Coins,
  DollarSign,
  Plus,
  Scissors,
  Star,
  UserPlus,
  Users,
  Wallet,
} from 'lucide-react';
import { useWorkspace } from '@/components/app/TenantWorkspaceContext';
import { Badge, type BadgeVariant } from '@/components/ui/Badge';
import { DonutChart, RevenueAreaChart, SparklineChart } from '@/components/ui/Charts';
import { Drawer } from '@/components/ui/Drawer';
import { DashboardSkeleton } from '@/components/ui/LoadingState';
import { getZonedDateParts } from '@/lib/domain/scheduling';
import type { Appointment } from '@/lib/types/domain';
import { formatCurrencyBRL, formatDateTimeBR, formatTimeBR } from '@/lib/utils';

const STATUS_MAP: Record<string, { label: string; variant: BadgeVariant }> = {
  confirmed: { label: 'Confirmado', variant: 'success' },
  pending: { label: 'Pendente', variant: 'warning' },
  in_progress: { label: 'Em atendimento', variant: 'info' },
  completed: { label: 'Concluído', variant: 'purple' },
  cancelled: { label: 'Cancelado', variant: 'danger' },
  no_show: { label: 'Não compareceu', variant: 'danger' },
};

const DONUT_COLORS = ['#D99A4E', '#4299E1', '#A66BEB', '#16C784', '#A5A09A'];

export default function DashboardPage() {
  const { data, selectedBranchId } = useWorkspace();
  const [periodDays, setPeriodDays] = useState<7 | 30 | 90>(30);
  const [selectedDayStr, setSelectedDayStr] = useState<string>(() =>
    getZonedDateParts(new Date().toISOString()).dateStr
  );
  const [detailAppointment, setDetailAppointment] = useState<Appointment | null>(null);

  const todayFormatted = useMemo(() => {
    return new Intl.DateTimeFormat('pt-BR', {
      weekday: 'long',
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    }).format(new Date());
  }, []);

  const weekStrip = useMemo(() => {
    const days: { dateStr: string; weekday: string; dayNum: string }[] = [];
    const base = new Date();
    for (let i = 0; i < 7; i++) {
      const d = new Date(base.getTime() + i * 24 * 60 * 60 * 1000);
      const dateStr = getZonedDateParts(d.toISOString()).dateStr;
      const weekday = new Intl.DateTimeFormat('pt-BR', { weekday: 'short' })
        .format(d)
        .replace('.', '');
      const dayNum = String(d.getDate()).padStart(2, '0');
      days.push({ dateStr, weekday, dayNum });
    }
    return days;
  }, []);

  const computed = useMemo(() => {
    if (!data) return null;

    const todayStr = getZonedDateParts(new Date().toISOString()).dateStr;
    const cutoffMs = Date.now() - periodDays * 24 * 60 * 60 * 1000;

    const appts = data.appointments.filter(
      (a) => selectedBranchId === 'all' || a.branch_id === selectedBranchId
    );

    const todayAppts = appts.filter(
      (a) => getZonedDateParts(a.starts_at).dateStr === todayStr && a.status !== 'cancelled'
    );
    const selectedDayAppts = appts
      .filter((a) => getZonedDateParts(a.starts_at).dateStr === selectedDayStr)
      .sort((a, b) => new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime());

    const completedToday = todayAppts.filter((a) => a.status === 'completed');
    const revenueToday = completedToday.reduce((acc, a) => acc + a.total_amount, 0);

    const branchCustomers = data.customers.filter(
      (c) => selectedBranchId === 'all' || !c.branch_id || c.branch_id === selectedBranchId
    );

    const reviews = data.reviews.filter((r) => r.overall_rating > 0);
    const avgRating =
      reviews.length > 0
        ? (reviews.reduce((acc, r) => acc + r.overall_rating, 0) / reviews.length).toFixed(1)
        : null;

    // Sparkline últimos 7 dias para agendamentos e faturamento
    const sparkAppts: number[] = [];
    const sparkRev: number[] = [];
    for (let i = 6; i >= 0; i--) {
      const dStr = getZonedDateParts(new Date(Date.now() - i * 86400000).toISOString()).dateStr;
      const dayList = appts.filter(
        (a) => getZonedDateParts(a.starts_at).dateStr === dStr && a.status !== 'cancelled'
      );
      sparkAppts.push(dayList.length);
      sparkRev.push(
        dayList.filter((a) => a.status === 'completed').reduce((sum, a) => sum + a.total_amount, 0)
      );
    }

    // Gráfico de faturamento no período
    const bucketCount = periodDays === 7 ? 7 : periodDays === 30 ? 10 : 12;
    const stepMs = (periodDays * 86400000) / bucketCount;
    const revenueSeries = Array.from({ length: bucketCount }).map((_, idx) => {
      const start = cutoffMs + idx * stepMs;
      const end = start + stepMs;
      const sum = appts
        .filter((a) => {
          if (a.status !== 'completed') return false;
          const t = new Date(a.starts_at).getTime();
          return t >= start && t < end;
        })
        .reduce((acc, a) => acc + a.total_amount, 0);
      const d = new Date(end);
      const label = `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`;
      return { label, value: sum };
    });

    const periodRevenue = appts
      .filter((a) => a.status === 'completed' && new Date(a.starts_at).getTime() >= cutoffMs)
      .reduce((acc, a) => acc + a.total_amount, 0);

    // Serviços mais vendidos (Donut)
    const serviceCounts = new Map<string, number>();
    const apptIds = new Set(appts.map((a) => a.id));
    for (const item of data.appointmentServices) {
      if (!apptIds.has(item.appointment_id)) continue;
      serviceCounts.set(item.service_name, (serviceCounts.get(item.service_name) || 0) + 1);
    }
    const sortedServices = [...serviceCounts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 4);
    const totalServicesCount = sortedServices.reduce((acc, [, v]) => acc + v, 0);
    const topService = sortedServices[0];
    const topServicePct =
      topService && totalServicesCount > 0
        ? `${Math.round((topService[1] / totalServicesCount) * 100)}%`
        : '0%';

    const donutSlices = sortedServices.map(([label, value], i) => ({
      label,
      value,
      color: DONUT_COLORS[i % DONUT_COLORS.length],
    }));

    // Últimos agendamentos
    const latestAppts = [...appts]
      .sort((a, b) => new Date(b.starts_at).getTime() - new Date(a.starts_at).getTime())
      .slice(0, 5);

    // Clientes recentes
    const recentCustomers = [...branchCustomers]
      .sort(
        (a, b) =>
          new Date(b.last_visit_at || b.created_at).getTime() -
          new Date(a.last_visit_at || a.created_at).getTime()
      )
      .slice(0, 5);

    // Controle Financeiro real
    const totalRevenueAll = appts
      .filter((a) => a.status === 'completed')
      .reduce((acc, a) => acc + a.total_amount, 0);
    const now = new Date();
    const monthRevenue = appts
      .filter((a) => {
        if (a.status !== 'completed') return false;
        const d = new Date(a.starts_at);
        return d.getUTCMonth() === now.getUTCMonth() && d.getUTCFullYear() === now.getUTCFullYear();
      })
      .reduce((acc, a) => acc + a.total_amount, 0);

    const cashIn = data.cashTransactions
      .filter((t) => selectedBranchId === 'all' || t.branch_id === selectedBranchId)
      .filter((t) => t.transaction_type === 'income' || t.transaction_type === 'supply')
      .reduce((acc, t) => acc + t.amount, 0);
    const cashOut = data.cashTransactions
      .filter((t) => selectedBranchId === 'all' || t.branch_id === selectedBranchId)
      .filter(
        (t) =>
          t.transaction_type === 'expense' ||
          t.transaction_type === 'bleed' ||
          t.transaction_type === 'commission_payout' ||
          t.transaction_type === 'refund'
      )
      .reduce((acc, t) => acc + t.amount, 0);
    const openBalance = data.cashRegisters
      .filter((r) => r.status === 'open')
      .reduce((acc, r) => acc + r.opening_balance, 0);
    const cashBalance = openBalance + cashIn - cashOut;

    return {
      todayApptsCount: todayAppts.length,
      revenueToday,
      customersCount: branchCustomers.length,
      avgRating,
      reviewsCount: reviews.length,
      sparkAppts,
      sparkRev,
      selectedDayAppts,
      latestAppts,
      revenueSeries,
      periodRevenue,
      donutSlices,
      topServiceLabel: topService ? topService[0] : 'Serviços',
      topServicePct,
      recentCustomers,
      totalRevenueAll,
      monthRevenue,
      cashBalance,
    };
  }, [data, periodDays, selectedBranchId, selectedDayStr]);

  if (!data || !computed) {
    return <DashboardSkeleton />;
  }

  const firstName = data.session.profile.full_name.split(' ')[0];

  const getCustomerName = (id: string) =>
    data.customers.find((c) => c.id === id)?.full_name || 'Cliente';
  const getBarberName = (id: string) =>
    data.barbers.find((b) => b.id === id)?.name || 'Profissional';
  const getServiceLabel = (apptId: string) => {
    const items = data.appointmentServices.filter((s) => s.appointment_id === apptId);
    return items.map((i) => i.service_name).join(' + ') || 'Atendimento';
  };

  return (
    <div className="space-y-6">
      {/* Saudação com banner sutil */}
      <div className="relative overflow-hidden rounded-2xl border border-[#292521] bg-[#151515] p-6">
        <Image
          src="/assets/hero/kortaz2-hero.jpg"
          alt="Ambiente Kortaz"
          fill
          sizes="1200px"
          className="object-cover opacity-15"
        />
        <div className="relative z-10 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <h1 className="font-display text-2xl font-bold tracking-tight text-[#F5F1EB] sm:text-3xl">
              Olá, {firstName}!
            </h1>
            <p className="mt-1 text-sm text-[#A5A09A]">
              Aqui está o resumo do seu estabelecimento hoje.
            </p>
            <div className="mt-3 inline-flex items-center gap-2 rounded-lg border border-[#292521] bg-[#090909]/80 px-3 py-1.5 text-xs font-medium capitalize text-[#F2B968]">
              <Calendar className="h-3.5 w-3.5 text-[#D99A4E]" />
              <span>{todayFormatted}</span>
            </div>
          </div>

          <Link
            href="/app/agenda"
            className="inline-flex items-center gap-2 self-start rounded-xl bg-[#D99A4E] px-4 py-2.5 text-xs font-bold text-[#090909] transition-colors hover:bg-[#F2B968] sm:self-auto"
          >
            <Plus className="h-4 w-4" />
            Novo agendamento
          </Link>
        </div>
      </div>

      {/* 4 Cards de Indicadores */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-2xl border border-[#292521] bg-[#151515] p-5">
          <div className="flex items-center justify-between">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#D99A4E]/15 text-[#D99A4E]">
              <Calendar className="h-5 w-5" />
            </div>
            <span className="text-[11px] font-semibold text-[#A5A09A]">Hoje</span>
          </div>
          <p className="mt-4 font-display text-2xl font-bold text-[#F5F1EB]">
            {computed.todayApptsCount}
          </p>
          <p className="text-xs text-[#A5A09A]">Agendamentos hoje</p>
          <div className="mt-3">
            <SparklineChart values={computed.sparkAppts} color="#D99A4E" />
          </div>
        </div>

        <div className="rounded-2xl border border-[#292521] bg-[#151515] p-5">
          <div className="flex items-center justify-between">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#16C784]/15 text-[#16C784]">
              <DollarSign className="h-5 w-5" />
            </div>
            <span className="text-[11px] font-semibold text-[#16C784]">Concluídos hoje</span>
          </div>
          <p className="mt-4 font-display text-2xl font-bold text-[#F5F1EB]">
            {formatCurrencyBRL(computed.revenueToday)}
          </p>
          <p className="text-xs text-[#A5A09A]">Faturamento hoje</p>
          <div className="mt-3">
            <SparklineChart values={computed.sparkRev} color="#16C784" />
          </div>
        </div>

        <div className="rounded-2xl border border-[#292521] bg-[#151515] p-5">
          <div className="flex items-center justify-between">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#A66BEB]/15 text-[#A66BEB]">
              <Users className="h-5 w-5" />
            </div>
            <span className="text-[11px] font-semibold text-[#A5A09A]">Base CRM</span>
          </div>
          <p className="mt-4 font-display text-2xl font-bold text-[#F5F1EB]">
            {computed.customersCount}
          </p>
          <p className="text-xs text-[#A5A09A]">Clientes cadastrados</p>
          <div className="mt-3">
            <SparklineChart values={[1, 2, 3, 4, 4, 5, Math.max(1, computed.customersCount)]} color="#A66BEB" />
          </div>
        </div>

        <div className="rounded-2xl border border-[#292521] bg-[#151515] p-5">
          <div className="flex items-center justify-between">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#4299E1]/15 text-[#4299E1]">
              <Star className="h-5 w-5" />
            </div>
            <span className="text-[11px] font-semibold text-[#A5A09A]">
              {computed.reviewsCount > 0 ? `${computed.reviewsCount} avaliações` : 'Sem avaliações'}
            </span>
          </div>
          <p className="mt-4 font-display text-2xl font-bold text-[#F5F1EB]">
            {computed.avgRating ?? '—'}
          </p>
          <p className="text-xs text-[#A5A09A]">Avaliação dos clientes</p>
          <div className="mt-3">
            <SparklineChart values={[4.5, 4.7, 4.8, 4.8, 4.9, 4.9, 5]} color="#4299E1" />
          </div>
        </div>
      </div>

      {/* Agenda de Hoje + Últimos Agendamentos */}
      <div className="grid gap-5 lg:grid-cols-12">
        <div className="rounded-2xl border border-[#292521] bg-[#151515] p-5 lg:col-span-7">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-base font-bold text-[#F5F1EB]">Agenda de Hoje</h2>
            <Link
              href="/app/agenda"
              className="inline-flex items-center gap-1 text-xs font-semibold text-[#D99A4E] hover:text-[#F2B968]"
            >
              Ver agenda
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>

          <div className="mt-4 grid grid-cols-7 gap-2">
            {weekStrip.map((day) => {
              const active = day.dateStr === selectedDayStr;
              return (
                <button
                  key={day.dateStr}
                  type="button"
                  onClick={() => setSelectedDayStr(day.dateStr)}
                  className={`flex flex-col items-center rounded-xl border py-2 text-center transition-colors ${
                    active
                      ? 'border-[#D99A4E] bg-[#D99A4E] text-[#090909]'
                      : 'border-[#292521] bg-[#1B1B1B] text-[#A5A09A] hover:text-[#F5F1EB]'
                  }`}
                >
                  <span className="text-[10px] font-medium capitalize">{day.weekday}</span>
                  <span className="mt-0.5 font-display text-sm font-bold">{day.dayNum}</span>
                </button>
              );
            })}
          </div>

          <div className="mt-4 space-y-2.5">
            {computed.selectedDayAppts.length === 0 ? (
              <div className="rounded-xl border border-dashed border-[#292521] bg-[#111111] p-6 text-center text-xs text-[#A5A09A]">
                Nenhum agendamento para este dia.
              </div>
            ) : (
              computed.selectedDayAppts.slice(0, 5).map((appt) => {
                const st = STATUS_MAP[appt.status] || { label: appt.status, variant: 'neutral' as BadgeVariant };
                return (
                  <button
                    key={appt.id}
                    type="button"
                    onClick={() => setDetailAppointment(appt)}
                    className="flex w-full items-center justify-between gap-3 rounded-xl border border-[#292521] bg-[#1B1B1B] px-3.5 py-2.5 text-left transition-colors hover:border-[#D99A4E]/50"
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <span className="shrink-0 font-mono text-xs font-semibold text-[#D99A4E]">
                        {formatTimeBR(appt.starts_at)}
                      </span>
                      <div className="min-w-0">
                        <p className="truncate text-xs font-semibold text-[#F5F1EB]">
                          {getCustomerName(appt.customer_id)}
                        </p>
                        <p className="truncate text-[11px] text-[#A5A09A]">
                          {getServiceLabel(appt.id)} · {getBarberName(appt.barber_id)}
                        </p>
                      </div>
                    </div>
                    <Badge variant={st.variant}>{st.label}</Badge>
                  </button>
                );
              })
            )}

            <Link
              href="/app/agenda"
              className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-[#292521] py-2.5 text-xs font-semibold text-[#A5A09A] transition-colors hover:border-[#D99A4E]/50 hover:text-[#F5F1EB]"
            >
              <Plus className="h-3.5 w-3.5" />
              Novo agendamento
            </Link>
          </div>
        </div>

        {/* Últimos Agendamentos */}
        <div className="rounded-2xl border border-[#292521] bg-[#151515] p-5 lg:col-span-5">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-base font-bold text-[#F5F1EB]">
              Últimos Agendamentos
            </h2>
            <Link
              href="/app/agendamentos"
              className="inline-flex items-center gap-1 text-xs font-semibold text-[#D99A4E] hover:text-[#F2B968]"
            >
              Ver todos
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>

          <div className="mt-4 space-y-2.5">
            {computed.latestAppts.length === 0 ? (
              <p className="py-8 text-center text-xs text-[#A5A09A]">
                Nenhum agendamento registrado ainda.
              </p>
            ) : (
              computed.latestAppts.map((appt) => {
                const name = getCustomerName(appt.customer_id);
                const initials = name
                  .split(' ')
                  .slice(0, 2)
                  .map((p) => p[0])
                  .join('')
                  .toUpperCase();
                const st = STATUS_MAP[appt.status] || { label: appt.status, variant: 'neutral' as BadgeVariant };

                return (
                  <button
                    key={appt.id}
                    type="button"
                    onClick={() => setDetailAppointment(appt)}
                    className="flex w-full items-center justify-between gap-3 rounded-xl border border-[#292521] bg-[#1B1B1B] px-3.5 py-2.5 text-left transition-colors hover:border-[#D99A4E]/40"
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#D99A4E]/20 text-[11px] font-bold text-[#F2B968]">
                        {initials}
                      </div>
                      <div className="min-w-0">
                        <p className="truncate text-xs font-semibold text-[#F5F1EB]">{name}</p>
                        <p className="truncate text-[11px] text-[#A5A09A]">
                          {getServiceLabel(appt.id)} · {formatTimeBR(appt.starts_at)}
                        </p>
                      </div>
                    </div>
                    <Badge variant={st.variant}>{st.label}</Badge>
                  </button>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* Faturamento + Serviços Mais Vendidos */}
      <div className="grid gap-5 lg:grid-cols-12">
        <div className="rounded-2xl border border-[#292521] bg-[#151515] p-5 lg:col-span-7">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs font-medium text-[#A5A09A]">Faturamento</p>
              <p className="mt-0.5 font-display text-2xl font-bold text-[#F5F1EB]">
                {formatCurrencyBRL(computed.periodRevenue)}
              </p>
            </div>
            <div className="inline-flex rounded-xl border border-[#292521] bg-[#111111] p-1 text-xs">
              {([7, 30, 90] as const).map((days) => (
                <button
                  key={days}
                  type="button"
                  onClick={() => setPeriodDays(days)}
                  className={`rounded-lg px-2.5 py-1 font-semibold transition-colors ${
                    periodDays === days
                      ? 'bg-[#D99A4E] text-[#090909]'
                      : 'text-[#A5A09A] hover:text-[#F5F1EB]'
                  }`}
                >
                  {days}d
                </button>
              ))}
            </div>
          </div>

          <div className="mt-4">
            <RevenueAreaChart data={computed.revenueSeries} />
          </div>
        </div>

        <div className="rounded-2xl border border-[#292521] bg-[#151515] p-5 lg:col-span-5">
          <h2 className="font-display text-base font-bold text-[#F5F1EB]">
            Serviços Mais Vendidos
          </h2>
          <p className="mt-0.5 text-xs text-[#A5A09A]">Participação por atendimentos</p>
          <div className="mt-6">
            <DonutChart
              slices={computed.donutSlices}
              centerValue={computed.topServicePct}
              centerLabel={computed.topServiceLabel}
            />
          </div>
        </div>
      </div>

      {/* Seus Clientes + Banner Marketing */}
      <div className="grid gap-5 lg:grid-cols-12">
        <div className="rounded-2xl border border-[#292521] bg-[#151515] p-5 lg:col-span-6">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-base font-bold text-[#F5F1EB]">Clientes Recentes</h2>
            <Link
              href="/app/clientes"
              className="inline-flex items-center gap-1 text-xs font-semibold text-[#D99A4E] hover:text-[#F2B968]"
            >
              Ver todos
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-5">
            {computed.recentCustomers.map((c) => {
              const initials = c.full_name
                .split(' ')
                .slice(0, 2)
                .map((p) => p[0])
                .join('')
                .toUpperCase();
              return (
                <Link
                  key={c.id}
                  href="/app/clientes"
                  className="flex flex-col items-center rounded-xl border border-[#292521] bg-[#1B1B1B] p-3 text-center transition-colors hover:border-[#D99A4E]/50"
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#D99A4E]/20 text-xs font-bold text-[#F2B968]">
                    {initials}
                  </div>
                  <p className="mt-2 w-full truncate text-xs font-semibold text-[#F5F1EB]">
                    {c.full_name.split(' ')[0]}
                  </p>
                  <p className="text-[10px] text-[#A5A09A]">{c.visits_count} visita(s)</p>
                </Link>
              );
            })}
          </div>
        </div>

        <div className="relative overflow-hidden rounded-2xl border border-[#D99A4E]/30 bg-[#151515] p-6 lg:col-span-6">
          <Image
            src="/assets/gallery/kortaz2-marketing.jpg"
            alt="Marketing para barbearia e salão"
            fill
            sizes="600px"
            className="object-cover opacity-30"
          />
          <div className="relative z-10 flex h-full flex-col justify-between">
            <div>
              <span className="rounded-md bg-[#D99A4E]/20 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[#F2B968]">
                Marketing
              </span>
              <h3 className="mt-3 max-w-xs font-display text-lg font-bold text-[#F5F1EB]">
                Atraia mais clientes para sua barbearia!
              </h3>
              <p className="mt-1 max-w-sm text-xs text-[#A5A09A]">
                Crie campanhas, cupons promocionais e dispare lembretes automáticos via WhatsApp.
              </p>
            </div>
            <div className="mt-4">
              <Link
                href="/app/marketing"
                className="inline-flex items-center gap-2 rounded-xl bg-[#D99A4E] px-4 py-2 text-xs font-bold text-[#090909] hover:bg-[#F2B968]"
              >
                Ver campanhas
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Controle Financeiro + Ações Rápidas */}
      <div className="grid gap-5 lg:grid-cols-12">
        <div className="rounded-2xl border border-[#292521] bg-[#151515] p-5 lg:col-span-7">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-base font-bold text-[#F5F1EB]">
              Controle Financeiro
            </h2>
            <Link
              href="/app/financeiro"
              className="inline-flex items-center gap-1 text-xs font-semibold text-[#D99A4E] hover:text-[#F2B968]"
            >
              Ver detalhes
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            <div className="rounded-xl border border-[#292521] bg-[#1B1B1B] p-4">
              <Wallet className="h-4 w-4 text-[#16C784]" />
              <p className="mt-2 font-display text-lg font-bold text-[#F5F1EB]">
                {formatCurrencyBRL(computed.totalRevenueAll)}
              </p>
              <p className="text-[11px] text-[#A5A09A]">Faturamento Total</p>
            </div>
            <div className="rounded-xl border border-[#292521] bg-[#1B1B1B] p-4">
              <Coins className="h-4 w-4 text-[#D99A4E]" />
              <p className="mt-2 font-display text-lg font-bold text-[#F5F1EB]">
                {formatCurrencyBRL(computed.monthRevenue)}
              </p>
              <p className="text-[11px] text-[#A5A09A]">Receitas do Mês</p>
            </div>
            <div className="rounded-xl border border-[#292521] bg-[#1B1B1B] p-4">
              <DollarSign className="h-4 w-4 text-[#F2B968]" />
              <p className="mt-2 font-display text-lg font-bold text-[#F5F1EB]">
                {formatCurrencyBRL(computed.cashBalance)}
              </p>
              <p className="text-[11px] text-[#A5A09A]">Saldo em Caixa</p>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-[#292521] bg-[#151515] p-5 lg:col-span-5">
          <h2 className="font-display text-base font-bold text-[#F5F1EB]">Ações Rápidas</h2>
          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-2">
            <Link
              href="/app/agenda"
              className="flex flex-col items-center justify-center rounded-xl border border-[#292521] bg-[#1B1B1B] p-3.5 text-center transition-colors hover:border-[#D99A4E]/60"
            >
              <CalendarPlus className="h-5 w-5 text-[#D99A4E]" />
              <span className="mt-2 text-xs font-semibold text-[#F5F1EB]">Novo Agendamento</span>
            </Link>
            <Link
              href="/app/clientes"
              className="flex flex-col items-center justify-center rounded-xl border border-[#292521] bg-[#1B1B1B] p-3.5 text-center transition-colors hover:border-[#D99A4E]/60"
            >
              <UserPlus className="h-5 w-5 text-[#D99A4E]" />
              <span className="mt-2 text-xs font-semibold text-[#F5F1EB]">Cadastrar Cliente</span>
            </Link>
            <Link
              href="/app/servicos"
              className="flex flex-col items-center justify-center rounded-xl border border-[#292521] bg-[#1B1B1B] p-3.5 text-center transition-colors hover:border-[#D99A4E]/60"
            >
              <Scissors className="h-5 w-5 text-[#D99A4E]" />
              <span className="mt-2 text-xs font-semibold text-[#F5F1EB]">Adicionar Serviço</span>
            </Link>
            <Link
              href="/app/relatorios"
              className="flex flex-col items-center justify-center rounded-xl border border-[#292521] bg-[#1B1B1B] p-3.5 text-center transition-colors hover:border-[#D99A4E]/60"
            >
              <BarChart3 className="h-5 w-5 text-[#D99A4E]" />
              <span className="mt-2 text-xs font-semibold text-[#F5F1EB]">Ver Relatórios</span>
            </Link>
          </div>
        </div>
      </div>

      {/* Drawer de Detalhes do Agendamento */}
      <Drawer
        open={Boolean(detailAppointment)}
        onClose={() => setDetailAppointment(null)}
        title="Detalhes do Agendamento"
        subtitle={detailAppointment ? formatDateTimeBR(detailAppointment.starts_at) : undefined}
      >
        {detailAppointment && (
          <div className="space-y-4 text-xs">
            <div className="rounded-xl border border-[#292521] bg-[#151515] p-4 space-y-2">
              <div className="flex justify-between">
                <span className="text-[#A5A09A]">Cliente</span>
                <span className="font-semibold text-[#F5F1EB]">
                  {getCustomerName(detailAppointment.customer_id)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#A5A09A]">Profissional</span>
                <span className="font-semibold text-[#F5F1EB]">
                  {getBarberName(detailAppointment.barber_id)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#A5A09A]">Serviços</span>
                <span className="font-semibold text-[#F5F1EB]">
                  {getServiceLabel(detailAppointment.id)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#A5A09A]">Valor total</span>
                <span className="font-bold text-[#F2B968]">
                  {formatCurrencyBRL(detailAppointment.total_amount)}
                </span>
              </div>
            </div>
            <Link
              href="/app/agendamentos"
              className="block w-full rounded-xl bg-[#D99A4E] py-2.5 text-center font-bold text-[#090909]"
            >
              Gerenciar em Agendamentos
            </Link>
          </div>
        )}
      </Drawer>
    </div>
  );
}
