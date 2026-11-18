'use client';

import { useMemo, useState } from 'react';
import { Calendar, Lock, Plus, CheckCircle2, XCircle } from 'lucide-react';
import { useWorkspace } from '@/components/app/TenantWorkspaceContext';
import { PermissionGuard } from '@/components/app/PermissionGuard';
import { formatCurrencyBRL, formatTimeBR } from '@/lib/utils';
import { buildZonedIso, getZonedDateParts } from '@/lib/domain/scheduling';

export default function AgendaPage() {
  const { data, selectedBranchId, refresh } = useWorkspace();
  const [viewMode, setViewMode] = useState<'day' | 'week' | 'month'>('day');
  const [selectedDate, setSelectedDate] = useState<string>(() =>
    getZonedDateParts(new Date().toISOString()).dateStr
  );
  const [selectedBarberFilter, setSelectedBarberFilter] = useState<string>('all');

  // Modal de bloqueio rápido
  const [blockBarberId, setBlockBarberId] = useState<string>('');
  const [blockStart, setBlockStart] = useState('13:00');
  const [blockEnd, setBlockEnd] = useState('14:00');
  const [blockReason, setBlockReason] = useState('Intervalo / Almoço estendido');
  const [blockType, setBlockType] = useState<'manual' | 'day_off' | 'vacation'>('manual');
  const [feedback, setFeedback] = useState<string | null>(null);

  const visibleBarbers = useMemo(() => {
    if (!data) return [];
    return data.barbers.filter(
      (b) =>
        b.is_active &&
        (selectedBranchId === 'all' || b.branch_id === selectedBranchId) &&
        (selectedBarberFilter === 'all' || b.id === selectedBarberFilter)
    );
  }, [data, selectedBranchId, selectedBarberFilter]);

  const hoursGrid = ['09', '10', '11', '12', '13', '14', '15', '16', '17', '18', '19'];

  const weekDates = useMemo(() => {
    const base = new Date(`${selectedDate}T12:00:00Z`);
    return Array.from({ length: 7 }).map((_, idx) => {
      const d = new Date(base);
      d.setUTCDate(base.getUTCDate() + idx);
      return d.toISOString().slice(0, 10);
    });
  }, [selectedDate]);

  if (!data) return null;

  async function handleBlockTime(e: React.FormEvent) {
    e.preventDefault();
    setFeedback(null);
    const targetBarber = data!.barbers.find((b) => b.id === (blockBarberId || visibleBarbers[0]?.id));
    if (!targetBarber) return;

    const res = await fetch('/api/appointments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        kind: 'blocked_time',
        tenantId: data!.tenant.id,
        branchId: targetBarber.branch_id,
        barberId: targetBarber.id,
        reason: blockReason,
        blockType,
        startsAt: buildZonedIso(selectedDate, blockStart),
        endsAt: buildZonedIso(selectedDate, blockEnd),
      }),
    });
    const json = await res.json();
    if (!res.ok) {
      setFeedback(json.error || 'Erro ao bloquear horário.');
      return;
    }
    setFeedback(`Horário bloqueado para ${targetBarber.name} (${blockStart}–${blockEnd}).`);
    await refresh();
  }

  async function handleStatusAction(appointmentId: string, action: 'confirm' | 'complete' | 'cancel') {
    await fetch(`/api/appointments/${appointmentId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        tenantId: data!.tenant.id,
        action,
        ...(action === 'complete' ? { paymentMethod: 'pix' } : {}),
      }),
    });
    await refresh();
  }

  return (
    <PermissionGuard resource="agenda">
      <div className="space-y-6">
        <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
          <div>
            <h1 className="font-serif text-3xl font-semibold">Agenda Profissional</h1>
            <p className="text-xs text-[#B59E8D]">
              Visualização diária, semanal e mensal com bloqueio instantâneo de folgas e férias.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="inline-flex rounded-lg border border-white/10 bg-[#18100C] p-1 text-xs">
              {(['day', 'week', 'month'] as const).map((mode) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => setViewMode(mode)}
                  className={`rounded-md px-3 py-1.5 font-semibold ${
                    viewMode === mode ? 'bg-[#D49B6A] text-[#0E0906]' : 'text-[#B59E8D]'
                  }`}
                >
                  {mode === 'day' ? 'Diária' : mode === 'week' ? 'Semanal' : 'Mensal'}
                </button>
              ))}
            </div>

            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="rounded-lg border border-white/10 bg-[#18100C] px-3 py-2 text-xs text-[#F7EFE6]"
            />

            <select
              value={selectedBarberFilter}
              onChange={(e) => setSelectedBarberFilter(e.target.value)}
              className="rounded-lg border border-white/10 bg-[#18100C] px-3 py-2 text-xs text-[#F7EFE6]"
            >
              <option value="all">Todos barbeiros</option>
              {data.barbers.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Formulário Rápido de Bloqueio / Folga / Férias */}
        <form
          onSubmit={handleBlockTime}
          className="grid gap-3 rounded-xl border border-white/10 bg-[#18100C] p-4 sm:grid-cols-6 items-end text-xs"
        >
          <div>
            <label className="mb-1 block text-[#B59E8D]">Profissional</label>
            <select
              value={blockBarberId || visibleBarbers[0]?.id || ''}
              onChange={(e) => setBlockBarberId(e.target.value)}
              className="w-full rounded-lg border border-white/10 bg-[#0E0906] px-2.5 py-2"
            >
              {visibleBarbers.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-[#B59E8D]">Tipo</label>
            <select
              value={blockType}
              onChange={(e) => setBlockType(e.target.value as 'manual' | 'day_off' | 'vacation')}
              className="w-full rounded-lg border border-white/10 bg-[#0E0906] px-2.5 py-2"
            >
              <option value="manual">Bloqueio pontual</option>
              <option value="day_off">Folga</option>
              <option value="vacation">Férias</option>
            </select>
          </div>
          <div>
            <label className="mb-1 block text-[#B59E8D]">Início</label>
            <input
              type="time"
              value={blockStart}
              onChange={(e) => setBlockStart(e.target.value)}
              className="w-full rounded-lg border border-white/10 bg-[#0E0906] px-2.5 py-2"
            />
          </div>
          <div>
            <label className="mb-1 block text-[#B59E8D]">Fim</label>
            <input
              type="time"
              value={blockEnd}
              onChange={(e) => setBlockEnd(e.target.value)}
              className="w-full rounded-lg border border-white/10 bg-[#0E0906] px-2.5 py-2"
            />
          </div>
          <div>
            <label className="mb-1 block text-[#B59E8D]">Motivo</label>
            <input
              type="text"
              value={blockReason}
              onChange={(e) => setBlockReason(e.target.value)}
              className="w-full rounded-lg border border-white/10 bg-[#0E0906] px-2.5 py-2"
            />
          </div>
          <button
            type="submit"
            className="flex items-center justify-center gap-1.5 rounded-lg bg-[#D49B6A] py-2 font-bold text-[#0E0906]"
          >
            <Lock className="h-3.5 w-3.5" />
            <span>Bloquear Horário</span>
          </button>
        </form>

        {feedback && (
          <p className="rounded-lg border border-[#D49B6A]/30 bg-[#D49B6A]/10 px-4 py-2 text-xs text-[#D49B6A]">
            {feedback}
          </p>
        )}

        {/* Grade Diária por Profissional */}
        {viewMode === 'day' && (
          <div className="overflow-x-auto rounded-xl border border-white/10 bg-[#18100C]">
            <table className="w-full min-w-[680px] text-left text-xs">
              <thead className="border-b border-white/10 bg-[#0E0906]">
                <tr>
                  <th className="w-20 p-3 text-[#B59E8D]">Hora</th>
                  {visibleBarbers.map((barber) => (
                    <th key={barber.id} className="p-3 font-semibold text-[#F7EFE6]">
                      <div className="flex items-center gap-2">
                        <img
                          src={barber.avatar_url}
                          alt={barber.name}
                          className="h-6 w-6 rounded-full object-cover"
                        />
                        <span>{barber.name}</span>
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {hoursGrid.map((hour) => (
                  <tr key={hour} className="hover:bg-white/[0.02]">
                    <td className="p-3 font-mono text-[#B59E8D]">{hour}:00</td>
                    {visibleBarbers.map((barber) => {
                      const appts = data.appointments.filter((a) => {
                        if (a.barber_id !== barber.id || a.status === 'cancelled') return false;
                        const z = getZonedDateParts(a.starts_at);
                        return z.dateStr === selectedDate && z.timeStr.startsWith(hour);
                      });
                      const blocks = data.blockedTimes.filter((bl) => {
                        if (bl.barber_id !== barber.id) return false;
                        const z = getZonedDateParts(bl.starts_at);
                        return z.dateStr === selectedDate && z.timeStr.startsWith(hour);
                      });

                      return (
                        <td key={barber.id} className="p-2 align-top">
                          {appts.map((appt) => {
                            const cust = data.customers.find((c) => c.id === appt.customer_id);
                            return (
                              <div
                                key={appt.id}
                                className={`mb-1 rounded-lg border p-2 ${
                                  appt.status === 'completed'
                                    ? 'border-[#45C486]/40 bg-[#45C486]/10'
                                    : 'border-[#D49B6A]/50 bg-[#241710]'
                                }`}
                              >
                                <div className="flex items-center justify-between">
                                  <span className="font-semibold text-[#F7EFE6]">
                                    {formatTimeBR(appt.starts_at)} — {cust?.full_name || 'Cliente'}
                                  </span>
                                  <span className="text-[10px] text-[#D49B6A]">
                                    {formatCurrencyBRL(appt.total_amount)}
                                  </span>
                                </div>
                                <div className="mt-1.5 flex gap-1.5">
                                  {appt.status !== 'completed' && (
                                    <>
                                      <button
                                        type="button"
                                        onClick={() => handleStatusAction(appt.id, 'complete')}
                                        className="inline-flex items-center gap-1 rounded bg-[#45C486]/20 px-2 py-0.5 text-[10px] text-[#45C486]"
                                      >
                                        <CheckCircle2 className="h-3 w-3" /> Concluir
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => handleStatusAction(appt.id, 'cancel')}
                                        className="inline-flex items-center gap-1 rounded bg-[#E06258]/20 px-2 py-0.5 text-[10px] text-[#E06258]"
                                      >
                                        <XCircle className="h-3 w-3" /> Cancelar
                                      </button>
                                    </>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                          {blocks.map((bl) => (
                            <div
                              key={bl.id}
                              className="rounded border border-white/15 bg-[#0E0906] px-2 py-1 text-[10px] text-[#B59E8D]"
                            >
                              <Lock className="mr-1 inline h-3 w-3 text-[#D49B6A]" />
                              {bl.reason}
                            </div>
                          ))}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Visão Semanal */}
        {viewMode === 'week' && (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-7">
            {weekDates.map((dStr) => {
              const dayAppts = data.appointments.filter(
                (a) =>
                  a.status !== 'cancelled' &&
                  getZonedDateParts(a.starts_at).dateStr === dStr &&
                  (selectedBarberFilter === 'all' || a.barber_id === selectedBarberFilter)
              );
              return (
                <div key={dStr} className="rounded-xl border border-white/10 bg-[#18100C] p-3">
                  <p className="border-b border-white/10 pb-2 text-xs font-bold text-[#D49B6A]">
                    {dStr.split('-').reverse().join('/')}
                  </p>
                  <div className="mt-2 space-y-2">
                    {dayAppts.length === 0 ? (
                      <p className="text-[11px] text-[#B59E8D]">Livre</p>
                    ) : (
                      dayAppts.map((a) => (
                        <div key={a.id} className="rounded bg-[#0E0906] p-2 text-[11px]">
                          <p className="font-semibold text-[#F7EFE6]">{formatTimeBR(a.starts_at)}</p>
                          <p className="truncate text-[#B59E8D]">
                            {data.customers.find((c) => c.id === a.customer_id)?.full_name}
                          </p>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Visão Mensal resumida */}
        {viewMode === 'month' && (
          <div className="rounded-xl border border-white/10 bg-[#18100C] p-5">
            <div className="flex items-center gap-2 text-sm font-semibold text-[#D49B6A]">
              <Calendar className="h-4 w-4" />
              <span>Resumo Mensal de Agendamentos ({selectedDate.slice(0, 7)})</span>
            </div>
            <div className="mt-4 grid gap-3 sm:grid-cols-4">
              {data.appointments
                .filter((a) => getZonedDateParts(a.starts_at).dateStr.startsWith(selectedDate.slice(0, 7)))
                .map((a) => (
                  <div key={a.id} className="rounded-lg border border-white/10 bg-[#0E0906] p-3 text-xs">
                    <p className="font-semibold text-[#F7EFE6]">
                      {getZonedDateParts(a.starts_at).dateStr.split('-').reverse().join('/')} às{' '}
                      {formatTimeBR(a.starts_at)}
                    </p>
                    <p className="text-[#B59E8D]">
                      {data.customers.find((c) => c.id === a.customer_id)?.full_name} &bull; {a.status}
                    </p>
                  </div>
                ))}
            </div>
          </div>
        )}
      </div>
    </PermissionGuard>
  );
}
