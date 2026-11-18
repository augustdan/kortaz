'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import {
  AlertTriangle,
  Calendar,
  CheckCircle2,
  Clock,
  Coins,
  DollarSign,
  TrendingUp,
  UserCheck,
  UserPlus,
  Users,
  XCircle,
} from 'lucide-react';
import { useWorkspace } from '@/components/app/TenantWorkspaceContext';
import { HudCrosshair, HudPerformanceWidget } from '@/components/ui/HudPrimitives';
import { formatCurrencyBRL, formatDateTimeBR, formatTimeBR } from '@/lib/utils';
import { getZonedDateParts } from '@/lib/domain/scheduling';

export default function DashboardPage() {
  const { data, selectedBranchId, refresh } = useWorkspace();
  const [selectedBarberId, setSelectedBarberId] = useState<string>('all');
  const [periodDays, setPeriodDays] = useState<number>(30);

  const todayStr = useMemo(() => {
    const now = new Date();
    return getZonedDateParts(now.toISOString()).dateStr;
  }, []);

  const filteredData = useMemo(() => {
    if (!data) return null;

    const cutoffMs = Date.now() - periodDays * 24 * 60 * 60 * 1000;

    const appts = data.appointments.filter((a) => {
      if (selectedBranchId !== 'all' && a.branch_id !== selectedBranchId) return false;
      if (selectedBarberId !== 'all' && a.barber_id !== selectedBarberId) return false;
      return true;
    });

    const periodAppts = appts.filter((a) => new Date(a.starts_at).getTime() >= cutoffMs);
    const todayAppts = appts.filter(
      (a) => getZonedDateParts(a.starts_at).dateStr === todayStr && a.status !== 'cancelled'
    );
    const futureAppts = appts.filter(
      (a) =>
        new Date(a.starts_at).getTime() > Date.now() &&
        a.status !== 'cancelled' &&
        a.status !== 'completed'
    );

    const completedToday = todayAppts.filter((a) => a.status === 'completed');
    const revenueToday = completedToday.reduce((acc, a) => acc + a.total_amount, 0);

    const now = new Date();
    const monthCompleted = appts.filter((a) => {
      if (a.status !== 'completed') return false;
      const d = new Date(a.starts_at);
      return d.getUTCMonth() === now.getUTCMonth() && d.getUTCFullYear() === now.getUTCFullYear();
    });
    const revenueMonth = monthCompleted.reduce((acc, a) => acc + a.total_amount, 0);

    const completedPeriod = periodAppts.filter((a) => a.status === 'completed');
    const cancelledPeriod = periodAppts.filter((a) => a.status === 'cancelled');
    const noShowPeriod = periodAppts.filter((a) => a.status === 'no_show');
    const attendanceDenom = completedPeriod.length + noShowPeriod.length;
    const attendanceRate =
      attendanceDenom > 0 ? Math.round((completedPeriod.length / attendanceDenom) * 100) : 100;

    const averageTicket =
      completedPeriod.length > 0
        ? completedPeriod.reduce((acc, a) => acc + a.total_amount, 0) / completedPeriod.length
        : 0;

    const branchCustomers = data.customers.filter(
      (c) => selectedBranchId === 'all' || !c.branch_id || c.branch_id === selectedBranchId
    );
    const newCustomers = branchCustomers.filter((c) => c.visits_count <= 1).length;
    const recurringCustomers = branchCustomers.filter((c) => c.visits_count >= 2).length;

    const activeBarbersCount = Math.max(
      1,
      data.barbers.filter(
        (b) =>
          b.is_active &&
          (selectedBranchId === 'all' || b.branch_id === selectedBranchId) &&
          (selectedBarberId === 'all' || b.id === selectedBarberId)
      ).length
    );
    const occupancyRate = Math.min(
      100,
      Math.round((todayAppts.length / (activeBarbersCount * 12)) * 100)
    );

    const pendingCommissions = data.commissions
      .filter(
        (c) =>
          c.status === 'pending' &&
          (selectedBranchId === 'all' || c.branch_id === selectedBranchId) &&
          (selectedBarberId === 'all' || c.barber_id === selectedBarberId)
      )
      .reduce((acc, c) => acc + c.final_amount, 0);

    const nextUpcoming = appts
      .filter((a) => a.status === 'confirmed' || a.status === 'pending' || a.status === 'in_progress')
      .sort((a, b) => new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime())[0];

    const dailySeries = Array.from({ length: 7 }).map((_, idx) => {
      const d = new Date();
      d.setDate(d.getDate() - (6 - idx));
      const dStr = getZonedDateParts(d.toISOString()).dateStr;
      const total = appts
        .filter((a) => a.status === 'completed' && getZonedDateParts(a.starts_at).dateStr === dStr)
        .reduce((acc, a) => acc + a.total_amount, 0);
      return {
        label: dStr.slice(5).split('-').reverse().join('/'),
        total,
      };
    });

    const serviceCounts = data.services
      .map((svc) => {
        const count = data.appointmentServices.filter(
          (as) =>
            as.service_id === svc.id &&
            appts.some((ap) => ap.id === as.appointment_id && ap.status !== 'cancelled')
        ).length;
        return { name: svc.name, count, revenue: count * svc.price };
      })
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    const barberStats = data.barbers
      .filter((b) => selectedBranchId === 'all' || b.branch_id === selectedBranchId)
      .map((b) => {
        const rev = appts
          .filter((a) => a.barber_id === b.id && a.status === 'completed')
          .reduce((acc, a) => acc + a.total_amount, 0);
        return { id: b.id, name: b.name, revenue: rev };
      });

    const peakHours = [9, 10, 11, 14, 15, 16, 17, 18, 19].map((h) => ({
      hour: `${h}h`,
      count: appts.filter(
        (a) =>
          a.status !== 'cancelled' &&
          Number(getZonedDateParts(a.starts_at).timeStr.split(':')[0]) === h
      ).length,
    }));

    const lowStockProducts = data.products.filter(
      (p) =>
        p.stock_quantity <= p.min_stock_level &&
        (selectedBranchId === 'all' || p.branch_id === selectedBranchId)
    );

    return {
      revenueToday,
      revenueMonth,
      todayCount: todayAppts.length,
      futureCount: futureAppts.length,
      completedCount: completedPeriod.length,
      cancelledCount: cancelledPeriod.length,
      attendanceRate,
      averageTicket,
      newCustomers,
      recurringCustomers,
      occupancyRate,
      pendingCommissions,
      nextUpcoming,
      dailySeries,
      serviceCounts,
      barberStats,
      peakHours,
      lowStockProducts,
    };
  }, [data, selectedBranchId, selectedBarberId, periodDays, todayStr]);

  if (!data || !filteredData) return null;

  async function quickAction(appointmentId: string, action: 'confirm' | 'complete') {
    await fetch(`/api/appointments/${appointmentId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        tenantId: data?.tenant.id,
        action,
        ...(action === 'complete' ? { paymentMethod: 'pix' } : {}),
      }),
    });
    await refresh();
  }

  const maxDaily = Math.max(1, ...filteredData.dailySeries.map((d) => d.total));
  const maxBarber = Math.max(1, ...filteredData.barberStats.map((b) => b.revenue));
  const maxPeak = Math.max(1, ...filteredData.peakHours.map((h) => h.count));

  return (
    <div className="space-y-6">
      {/* Header HUD */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-[#D49B6A]">
            • TELEMETRIA OPERACIONAL
          </p>
          <h1 className="font-serif text-3xl font-semibold text-[#F7EFE6]">
            Cockpit de Gestão Kortaz
          </h1>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <select
            aria-label="Filtrar período"
            value={periodDays}
            onChange={(e) => setPeriodDays(Number(e.target.value))}
            className="rounded-full border border-[#D49B6A]/25 bg-[#18100C] px-4 py-2 text-xs text-[#F7EFE6]"
          >
            <option value={7}>Últimos 7 dias</option>
            <option value={30}>Últimos 30 dias</option>
            <option value={90}>Últimos 90 dias</option>
          </select>

          <select
            aria-label="Filtrar especialista"
            value={selectedBarberId}
            onChange={(e) => setSelectedBarberId(e.target.value)}
            className="rounded-full border border-[#D49B6A]/25 bg-[#18100C] px-4 py-2 text-xs text-[#F7EFE6]"
          >
            <option value="all">Todos os especialistas</option>
            {data.barbers.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Alertas HUD */}
      {(filteredData.lowStockProducts.length > 0 ||
        data.intelligence.highRiskUpcomingAppointments.length > 0) && (
        <div className="grid gap-3 md:grid-cols-2">
          {filteredData.lowStockProducts.length > 0 && (
            <Link
              href="/app/estoque"
              className="flex items-start gap-3 rounded-2xl border border-[#D49B6A]/45 bg-[#D49B6A]/10 p-4 text-xs"
            >
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-[#D49B6A]" />
              <div>
                <p className="font-semibold text-[#F7EFE6]">
                  Alerta de Reposição ({filteredData.lowStockProducts.length} produto(s))
                </p>
                <p className="mt-0.5 text-[#B59E8D]">
                  {filteredData.lowStockProducts.map((p) => p.name).join(', ')} abaixo do mínimo.
                </p>
              </div>
            </Link>
          )}
          {data.intelligence.highRiskUpcomingAppointments.length > 0 && (
            <Link
              href="/app/agendamentos"
              className="flex items-start gap-3 rounded-2xl border border-[#E06258]/40 bg-[#E06258]/10 p-4 text-xs"
            >
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-[#E06258]" />
              <div>
                <p className="font-semibold text-[#F7EFE6]">
                  Prevenção de Faltas ({data.intelligence.highRiskUpcomingAppointments.length})
                </p>
                <p className="mt-0.5 text-[#B59E8D]">
                  {data.intelligence.highRiskUpcomingAppointments[0].customerName} possui histórico
                  de no-show. Recomendado confirmar presença.
                </p>
              </div>
            </Link>
          )}
        </div>
      )}

      {/* Próximo Atendimento + Widget Performance Curva Suave */}
      <div className="grid gap-5 lg:grid-cols-12">
        <div className="hud-panel relative flex flex-col justify-between gap-4 rounded-2xl p-5 lg:col-span-8 sm:flex-row sm:items-center">
          <HudCrosshair className="absolute left-2.5 top-2.5" />
          <HudCrosshair className="absolute right-2.5 top-2.5" />
          {filteredData.nextUpcoming ? (
            <>
              <div>
                <span className="text-[10px] font-bold uppercase tracking-widest text-[#D49B6A]">
                  • PRÓXIMO ATENDIMENTO NA CADEIRA
                </span>
                <p className="mt-1 font-serif text-2xl font-semibold text-[#F7EFE6]">
                  {data.customers.find((c) => c.id === filteredData.nextUpcoming?.customer_id)
                    ?.full_name || 'Cliente'}{' '}
                  &bull; {formatTimeBR(filteredData.nextUpcoming.starts_at)}
                </p>
                <p className="text-xs text-[#B59E8D]">
                  Com{' '}
                  {data.barbers.find((b) => b.id === filteredData.nextUpcoming?.barber_id)?.name} &bull;{' '}
                  {formatCurrencyBRL(filteredData.nextUpcoming.total_amount)}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                {filteredData.nextUpcoming.status === 'pending' && (
                  <button
                    type="button"
                    onClick={() => quickAction(filteredData.nextUpcoming!.id, 'confirm')}
                    className="rounded-full border border-[#D49B6A] px-4 py-2 text-xs font-semibold text-[#D49B6A]"
                  >
                    Confirmar
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => quickAction(filteredData.nextUpcoming!.id, 'complete')}
                  className="rounded-full bg-[#45C486] px-5 py-2 text-xs font-bold text-[#0E0906]"
                >
                  Concluir &amp; Gerar Comissão
                </button>
              </div>
            </>
          ) : (
            <div>
              <span className="text-[10px] font-bold uppercase tracking-widest text-[#D49B6A]">
                FILA OPERACIONAL
              </span>
              <p className="mt-1 text-sm text-[#B59E8D]">
                Nenhum atendimento pendente na fila neste momento.
              </p>
            </div>
          )}
        </div>

        <HudPerformanceWidget
          title="Performance"
          metric={formatCurrencyBRL(filteredData.revenueMonth)}
          caption="Faturamento realizado no mês"
          className="lg:col-span-4"
        />
      </div>

      {/* 12 KPIs Reais */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          {
            label: 'Faturamento Hoje',
            value: formatCurrencyBRL(filteredData.revenueToday),
            icon: DollarSign,
            accent: 'text-[#D49B6A]',
          },
          {
            label: 'Faturamento Mês',
            value: formatCurrencyBRL(filteredData.revenueMonth),
            icon: TrendingUp,
            accent: 'text-[#45C486]',
          },
          {
            label: 'Agendados Hoje / Futuros',
            value: `${filteredData.todayCount} hoje • ${filteredData.futureCount} futuros`,
            icon: Calendar,
            accent: 'text-[#F7EFE6]',
          },
          {
            label: 'Serviços Concluídos',
            value: String(filteredData.completedCount),
            icon: CheckCircle2,
            accent: 'text-[#45C486]',
          },
          {
            label: 'Cancelamentos',
            value: String(filteredData.cancelledCount),
            icon: XCircle,
            accent: 'text-[#E06258]',
          },
          {
            label: 'Comparecimento',
            value: `${filteredData.attendanceRate}%`,
            icon: UserCheck,
            accent: 'text-[#45C486]',
          },
          {
            label: 'Ticket Médio',
            value: formatCurrencyBRL(filteredData.averageTicket),
            icon: Coins,
            accent: 'text-[#D49B6A]',
          },
          {
            label: 'Novos / Recorrentes',
            value: `${filteredData.newCustomers} novos • ${filteredData.recurringCustomers} rec.`,
            icon: UserPlus,
            accent: 'text-[#F7EFE6]',
          },
          {
            label: 'Ocupação Hoje',
            value: `${filteredData.occupancyRate}%`,
            icon: Clock,
            accent: 'text-[#D49B6A]',
          },
          {
            label: 'Comissões Pendentes',
            value: formatCurrencyBRL(filteredData.pendingCommissions),
            icon: Coins,
            accent: 'text-[#D49B6A]',
          },
          {
            label: 'Previsão Agenda Futura',
            value: formatCurrencyBRL(data.intelligence.projectedAgendaRevenue),
            icon: TrendingUp,
            accent: 'text-[#B59E8D]',
          },
          {
            label: 'Clientes na Base',
            value: String(data.customers.length),
            icon: Users,
            accent: 'text-[#F7EFE6]',
          },
        ].map((kpi) => (
          <div key={kpi.label} className="hud-panel rounded-2xl p-4">
            <div className="flex items-center justify-between text-xs text-[#B59E8D]">
              <span>{kpi.label}</span>
              <kpi.icon className={`h-4 w-4 ${kpi.accent}`} />
            </div>
            <p className={`mt-2 text-lg font-bold ${kpi.accent}`}>{kpi.value}</p>
          </div>
        ))}
      </div>

      {/* Gráficos */}
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="hud-panel rounded-2xl p-5">
          <h2 className="text-sm font-semibold text-[#F7EFE6]">Faturamento Diário (7 dias)</h2>
          <div className="mt-6 flex h-44 items-end gap-3">
            {filteredData.dailySeries.map((day) => (
              <div key={day.label} className="flex flex-1 flex-col items-center gap-2">
                <span className="text-[10px] text-[#B59E8D]">
                  {day.total > 0 ? `R$${Math.round(day.total)}` : ''}
                </span>
                <div className="flex h-28 w-full items-end justify-center rounded-t bg-[#0E0906]">
                  <div
                    className="w-full rounded-t bg-gradient-to-t from-[#A86B3E] to-[#E5B386]"
                    style={{ height: `${Math.max(6, (day.total / maxDaily) * 100)}%` }}
                  />
                </div>
                <span className="text-[10px] text-[#B59E8D]">{day.label}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="hud-panel rounded-2xl p-5">
          <h2 className="text-sm font-semibold text-[#F7EFE6]">
            Desempenho por Especialista (Barbeiros &amp; Salão)
          </h2>
          <div className="mt-5 space-y-4">
            {filteredData.barberStats.map((b) => (
              <div key={b.id}>
                <div className="flex justify-between text-xs">
                  <span className="font-medium text-[#F7EFE6]">{b.name}</span>
                  <span className="text-[#D49B6A]">{formatCurrencyBRL(b.revenue)}</span>
                </div>
                <div className="mt-1.5 h-2.5 w-full overflow-hidden rounded-full bg-[#0E0906]">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-[#A86B3E] to-[#D49B6A]"
                    style={{ width: `${Math.max(4, (b.revenue / maxBarber) * 100)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="hud-panel rounded-2xl p-5">
          <h2 className="text-sm font-semibold text-[#F7EFE6]">Serviços Mais Procurados</h2>
          <div className="mt-4 space-y-3">
            {filteredData.serviceCounts.map((s) => (
              <div
                key={s.name}
                className="flex items-center justify-between rounded-xl border border-[#D49B6A]/15 bg-[#0E0906]/70 px-3 py-2.5 text-xs"
              >
                <span className="font-medium text-[#F7EFE6]">{s.name}</span>
                <span className="text-[#B59E8D]">
                  {s.count} atendimento(s) &bull;{' '}
                  <strong className="text-[#D49B6A]">{formatCurrencyBRL(s.revenue)}</strong>
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="hud-panel rounded-2xl p-5">
          <h2 className="text-sm font-semibold text-[#F7EFE6]">Horários Mais Movimentados</h2>
          <div className="mt-6 flex h-36 items-end gap-2">
            {filteredData.peakHours.map((h) => (
              <div key={h.hour} className="flex flex-1 flex-col items-center gap-1.5">
                <div className="flex h-24 w-full items-end rounded-t bg-[#0E0906]">
                  <div
                    className="w-full rounded-t bg-[#45C486]/80"
                    style={{ height: `${Math.max(8, (h.count / maxPeak) * 100)}%` }}
                  />
                </div>
                <span className="text-[10px] text-[#B59E8D]">{h.hour}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Atividades Recentes */}
      <div className="hud-panel rounded-2xl p-5">
        <h2 className="text-sm font-semibold text-[#F7EFE6]">Atividades Recentes</h2>
        <div className="mt-4 divide-y divide-white/5 text-xs">
          {data.auditLogs.slice(0, 8).map((log) => (
            <div key={log.id} className="flex items-center justify-between py-2.5">
              <div>
                <span className="font-semibold text-[#D49B6A]">{log.action}</span>{' '}
                <span className="text-[#B59E8D]">em {log.entity}</span>
              </div>
              <span className="text-[#B59E8D]">{formatDateTimeBR(log.created_at)}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
