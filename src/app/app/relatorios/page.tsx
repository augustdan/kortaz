'use client';

import { BarChart3, Building2, Clock, Sparkles, TrendingUp } from 'lucide-react';
import { useWorkspace } from '@/components/app/TenantWorkspaceContext';
import { PermissionGuard } from '@/components/app/PermissionGuard';
import { formatCurrencyBRL } from '@/lib/utils';

export default function IntelligenceReportsPage() {
  const { data } = useWorkspace();

  if (!data) return null;

  const intel = data.intelligence;

  return (
    <PermissionGuard resource="reports">
      <div className="space-y-6">
        <div>
          <h1 className="font-serif text-3xl font-semibold">Relatórios & Inteligência de Negócio</h1>
          <p className="text-xs text-[#B59E8D]">
            Análise baseada nos dados reais do banco, distinguindo receita realizada de previsões da agenda.
          </p>
        </div>

        {/* Previsão de Faturamento Transparente */}
        <div className="grid gap-4 md:grid-cols-3">
          <div className="rounded-xl border border-white/10 bg-[#18100C] p-5">
            <p className="text-xs text-[#B59E8D]">Receita Realizada no Mês (Faturada)</p>
            <p className="mt-1 text-2xl font-bold text-[#45C486]">
              {formatCurrencyBRL(intel.realizedRevenueMonth)}
            </p>
          </div>
          <div className="rounded-xl border border-[#D49B6A]/30 bg-[#18100C] p-5">
            <p className="text-xs text-[#D49B6A]">
              Estimativa da Agenda Confirmada/Pendente (Não Garantida)
            </p>
            <p className="mt-1 text-2xl font-bold text-[#D49B6A]">
              + {formatCurrencyBRL(intel.projectedAgendaRevenue)}
            </p>
          </div>
          <div className="rounded-xl border border-white/10 bg-[#18100C] p-5">
            <p className="text-xs text-[#B59E8D]">Projeção Total Estimada do Mês</p>
            <p className="mt-1 text-2xl font-bold text-[#F7EFE6]">
              {formatCurrencyBRL(intel.estimatedTotalMonthRevenue)}
            </p>
          </div>
        </div>

        {/* Comparativo Entre Unidades */}
        <div className="rounded-xl border border-white/10 bg-[#18100C] p-5">
          <h2 className="mb-4 flex items-center gap-2 text-sm font-semibold">
            <Building2 className="h-4 w-4 text-[#D49B6A]" /> Comparativo Entre Unidades
          </h2>
          <div className="grid gap-4 md:grid-cols-2">
            {intel.branchComparison.map((b) => (
              <div
                key={b.branchId}
                className="rounded-xl border border-white/5 bg-[#0E0906] p-4 flex items-center justify-between text-xs"
              >
                <div>
                  <p className="text-sm font-bold text-[#F7EFE6]">{b.name}</p>
                  <p className="text-[#B59E8D]">
                    {b.appointmentsCount} agendamentos &bull; Comparecimento: {b.attendanceRate}%
                  </p>
                </div>
                <span className="text-base font-bold text-[#D49B6A]">
                  {formatCurrencyBRL(b.completedRevenue)}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Rentabilidade por Profissional e Horários de Baixa Ocupação */}
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="rounded-xl border border-white/10 bg-[#18100C] p-5">
            <h2 className="mb-4 flex items-center gap-2 text-sm font-semibold">
              <BarChart3 className="h-4 w-4 text-[#D49B6A]" /> Rentabilidade por Profissional
            </h2>
            <div className="space-y-3 text-xs">
              {intel.barberProfitability.map((bp) => (
                <div
                  key={bp.barberId}
                  className="flex items-center justify-between rounded-lg border border-white/5 bg-[#0E0906] p-3"
                >
                  <div>
                    <p className="font-bold text-[#F7EFE6]">{bp.name}</p>
                    <p className="text-[#B59E8D]">
                      {bp.completedCount} concluído(s) &bull; Ticket médio:{' '}
                      {formatCurrencyBRL(bp.averageTicket)}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-[#D49B6A]">{formatCurrencyBRL(bp.grossRevenue)}</p>
                    <p className="text-[10px] text-[#B59E8D]">
                      {bp.goalProgressPercent}% da meta
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-xl border border-white/10 bg-[#18100C] p-5">
            <h2 className="mb-4 flex items-center gap-2 text-sm font-semibold">
              <Clock className="h-4 w-4 text-[#D49B6A]" /> Inteligência de Horários Ociosos
            </h2>
            <div className="space-y-2.5 text-xs">
              {intel.lowOccupancyHours.map((slot) => (
                <div
                  key={slot.hourLabel}
                  className="flex items-center justify-between rounded-lg border border-white/5 bg-[#0E0906] p-3"
                >
                  <div>
                    <span className="font-bold text-[#D49B6A]">{slot.hourLabel}</span>{' '}
                    <span className="text-[#B59E8D]">({slot.occupancyPercent}% ocupado)</span>
                    <p className="mt-0.5 text-[11px] text-[#B59E8D]">{slot.recommendation}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Assistente de Gestão Inteligente (Pronto para Expansão IA) */}
        <div className="rounded-xl border border-[#D49B6A]/30 bg-[#18100C] p-5">
          <div className="flex items-center gap-2 text-sm font-semibold text-[#D49B6A]">
            <Sparkles className="h-4 w-4" />
            <span>Insights Automáticos do Assistente de Gestão</span>
          </div>
          <ul className="mt-3 space-y-2 text-xs text-[#B59E8D]">
            <li className="flex items-start gap-2">
              <TrendingUp className="mt-0.5 h-3.5 w-3.5 text-[#45C486]" />
              <span>
                Há <strong className="text-[#F7EFE6]">{intel.inactiveCustomersForRecovery.length} cliente(s)</strong> sem
                comparecer há mais de {data.settings.inactive_days_threshold} dias. Acesse o CRM para
                acionar recuperação com cupom.
              </span>
            </li>
            <li className="flex items-start gap-2">
              <TrendingUp className="mt-0.5 h-3.5 w-3.5 text-[#D49B6A]" />
              <span>
                {intel.serviceProfitability[0]?.name}: margem estimada de{' '}
                <strong className="text-[#F7EFE6]">{intel.serviceProfitability[0]?.marginPercent}%</strong>.{' '}
                {intel.serviceProfitability[0]?.suggestion}
              </span>
            </li>
          </ul>
        </div>
      </div>
    </PermissionGuard>
  );
}
