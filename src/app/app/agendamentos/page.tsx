'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { AlertCircle, CalendarPlus, Check, RefreshCw, UserX, X } from 'lucide-react';
import { useWorkspace } from '@/components/app/TenantWorkspaceContext';
import { PermissionGuard } from '@/components/app/PermissionGuard';
import { formatCurrencyBRL, formatDateTimeBR } from '@/lib/utils';
import { buildZonedIso, getZonedDateParts } from '@/lib/domain/scheduling';

export default function AppointmentsPage() {
  const { data, selectedBranchId, refresh } = useWorkspace();
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [showNewModal, setShowNewModal] = useState(false);

  // Form Novo Agendamento / Encaixe
  const [branchId, setBranchId] = useState('');
  const [barberId, setBarberId] = useState('');
  const [serviceId, setServiceId] = useState('');
  const [dateStr, setDateStr] = useState(() => getZonedDateParts(new Date().toISOString()).dateStr);
  const [timeStr, setTimeStr] = useState('17:00');
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [source, setSource] = useState<'admin' | 'squeeze_in' | 'recurring'>('admin');
  const [formError, setFormError] = useState<string | null>(null);
  const [limitUpgradeLink, setLimitUpgradeLink] = useState(false);
  const [actionMsg, setActionMsg] = useState<string | null>(null);

  // Remarcação rápida
  const [rescheduleTargetId, setRescheduleTargetId] = useState<string | null>(null);
  const [rescheduleDate, setRescheduleDate] = useState(() =>
    getZonedDateParts(new Date().toISOString()).dateStr
  );
  const [rescheduleTime, setRescheduleTime] = useState('18:00');

  const filteredAppointments = useMemo(() => {
    if (!data) return [];
    return data.appointments
      .filter((a) => {
        if (selectedBranchId !== 'all' && a.branch_id !== selectedBranchId) return false;
        if (statusFilter !== 'all' && a.status !== statusFilter) return false;
        return true;
      })
      .sort((a, b) => new Date(b.starts_at).getTime() - new Date(a.starts_at).getTime());
  }, [data, selectedBranchId, statusFilter]);

  if (!data) return null;

  async function handleCreateAppointment(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);
    setLimitUpgradeLink(false);

    const effBranch =
      branchId ||
      (selectedBranchId !== 'all' ? selectedBranchId : data!.branches[0]?.id);
    const effService = serviceId || data!.services[0]?.id;

    const res = await fetch('/api/appointments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        tenantId: data!.tenant.id,
        branchId: effBranch,
        barberId: barberId || null,
        serviceIds: [effService],
        startsAt: buildZonedIso(dateStr, timeStr),
        customerName,
        customerPhone,
        source,
        isRecurring: source === 'recurring',
        recurrenceRule: source === 'recurring' ? 'weekly' : null,
      }),
    });

    const json = await res.json();
    if (!res.ok) {
      setFormError(json.error || 'Erro ao agendar.');
      if (res.status === 402) setLimitUpgradeLink(true);
      return;
    }

    setShowNewModal(false);
    setCustomerName('');
    setCustomerPhone('');
    setActionMsg(`Agendamento criado com sucesso com ${json.barber?.name}.`);
    await refresh();
  }

  async function runAction(
    id: string,
    action: 'confirm' | 'start' | 'complete' | 'cancel' | 'no_show' | 'reschedule'
  ) {
    setActionMsg(null);
    const body: Record<string, unknown> = {
      tenantId: data!.tenant.id,
      action,
    };
    if (action === 'complete') body.paymentMethod = 'pix';
    if (action === 'reschedule') {
      body.newStartsAt = buildZonedIso(rescheduleDate, rescheduleTime);
    }

    const res = await fetch(`/api/appointments/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const json = await res.json();
    if (!res.ok) {
      setActionMsg(json.error || 'Não foi possível executar a ação.');
      return;
    }

    if (action === 'cancel' && json.notifiedWaitlistCount > 0) {
      setActionMsg(
        `Agendamento cancelado. ${json.notifiedWaitlistCount} cliente(s) da Lista de Espera foram notificados automaticamente!`
      );
    } else if (action === 'complete') {
      setActionMsg('Atendimento concluído! Comissão gerada, estoque atualizado e pontos creditados.');
    } else {
      setActionMsg('Status atualizado com sucesso.');
    }
    setRescheduleTargetId(null);
    await refresh();
  }

  return (
    <PermissionGuard resource="appointments">
      <div className="space-y-6">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <h1 className="font-serif text-3xl font-semibold">Agendamentos & Lista de Espera</h1>
            <p className="text-xs text-[#B59E8D]">
              Gerencie confirmações, encaixes, remarcações, faltas e lista de espera automática.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="rounded-lg border border-white/10 bg-[#18100C] px-3 py-2 text-xs"
            >
              <option value="all">Todos os status</option>
              <option value="pending">Pendentes</option>
              <option value="confirmed">Confirmados</option>
              <option value="in_progress">Em atendimento</option>
              <option value="completed">Concluídos</option>
              <option value="cancelled">Cancelados</option>
              <option value="no_show">Não compareceu</option>
            </select>

            <button
              type="button"
              onClick={() => setShowNewModal((v) => !v)}
              className="inline-flex items-center gap-2 rounded-lg bg-[#D49B6A] px-4 py-2 text-xs font-bold text-[#0E0906]"
            >
              <CalendarPlus className="h-4 w-4" />
              <span>Novo Agendamento / Encaixe</span>
            </button>
          </div>
        </div>

        {actionMsg && (
          <div className="rounded-lg border border-[#D49B6A]/40 bg-[#D49B6A]/10 p-3 text-xs text-[#D49B6A]">
            {actionMsg}
          </div>
        )}

        {showNewModal && (
          <form
            onSubmit={handleCreateAppointment}
            className="rounded-xl border border-[#D49B6A]/40 bg-[#18100C] p-5 space-y-4 text-xs"
          >
            <h2 className="text-sm font-bold text-[#F7EFE6]">Novo Agendamento ou Encaixe</h2>
            <div className="grid gap-3 sm:grid-cols-3">
              <select
                value={branchId || data.branches[0]?.id}
                onChange={(e) => setBranchId(e.target.value)}
                className="rounded-lg border border-white/10 bg-[#0E0906] px-3 py-2"
              >
                {data.branches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
              <select
                value={serviceId || data.services[0]?.id}
                onChange={(e) => setServiceId(e.target.value)}
                className="rounded-lg border border-white/10 bg-[#0E0906] px-3 py-2"
              >
                {data.services.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} ({formatCurrencyBRL(s.price)})
                  </option>
                ))}
              </select>
              <select
                value={barberId}
                onChange={(e) => setBarberId(e.target.value)}
                className="rounded-lg border border-white/10 bg-[#0E0906] px-3 py-2"
              >
                <option value="">Qualquer profissional disponível</option>
                {data.barbers.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid gap-3 sm:grid-cols-5">
              <input
                type="date"
                required
                value={dateStr}
                onChange={(e) => setDateStr(e.target.value)}
                className="rounded-lg border border-white/10 bg-[#0E0906] px-3 py-2"
              />
              <input
                type="time"
                required
                value={timeStr}
                onChange={(e) => setTimeStr(e.target.value)}
                className="rounded-lg border border-white/10 bg-[#0E0906] px-3 py-2"
              />
              <input
                type="text"
                required
                placeholder="Nome do cliente"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                className="rounded-lg border border-white/10 bg-[#0E0906] px-3 py-2"
              />
              <input
                type="tel"
                required
                placeholder="WhatsApp"
                value={customerPhone}
                onChange={(e) => setCustomerPhone(e.target.value)}
                className="rounded-lg border border-white/10 bg-[#0E0906] px-3 py-2"
              />
              <select
                value={source}
                onChange={(e) => setSource(e.target.value as 'admin' | 'squeeze_in' | 'recurring')}
                className="rounded-lg border border-white/10 bg-[#0E0906] px-3 py-2"
              >
                <option value="admin">Agendamento normal</option>
                <option value="squeeze_in">Encaixe</option>
                <option value="recurring">Recorrente semanal</option>
              </select>
            </div>

            {formError && (
              <div className="flex items-center justify-between rounded-lg border border-[#E06258]/40 bg-[#E06258]/10 p-3 text-[#E06258]">
                <span className="flex items-center gap-2">
                  <AlertCircle className="h-4 w-4" />
                  {formError}
                </span>
                {limitUpgradeLink && (
                  <Link
                    href="/app/assinatura"
                    className="rounded bg-[#D49B6A] px-3 py-1 font-bold text-[#0E0906]"
                  >
                    Fazer Upgrade
                  </Link>
                )}
              </div>
            )}

            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowNewModal(false)}
                className="rounded-lg border border-white/15 px-4 py-2"
              >
                Fechar
              </button>
              <button
                type="submit"
                className="rounded-lg bg-[#D49B6A] px-5 py-2 font-bold text-[#0E0906]"
              >
                Confirmar Horário
              </button>
            </div>
          </form>
        )}

        {/* Lista de Agendamentos */}
        <div className="space-y-3">
          {filteredAppointments.map((appt) => {
            const customer = data.customers.find((c) => c.id === appt.customer_id);
            const barber = data.barbers.find((b) => b.id === appt.barber_id);
            const branch = data.branches.find((b) => b.id === appt.branch_id);
            const svcs = data.appointmentServices.filter((s) => s.appointment_id === appt.id);

            return (
              <div
                key={appt.id}
                className="rounded-xl border border-white/10 bg-[#18100C] p-4"
              >
                <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-bold text-[#F7EFE6]">
                        {customer?.full_name || 'Cliente'}
                      </span>
                      <span className="rounded bg-[#0E0906] px-2 py-0.5 text-[10px] uppercase tracking-wider text-[#D49B6A]">
                        {appt.status}
                      </span>
                      {appt.is_recurring && (
                        <span className="rounded bg-[#45C486]/15 px-2 py-0.5 text-[10px] text-[#45C486]">
                          Recorrente
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-[#B59E8D]">
                      {formatDateTimeBR(appt.starts_at)} &bull;{' '}
                      <strong className="text-[#F7EFE6]">{barber?.name}</strong> &bull; {branch?.name}
                    </p>
                    <p className="text-xs text-[#D49B6A]">
                      {svcs.map((s) => s.service_name).join(' + ')} &bull;{' '}
                      {formatCurrencyBRL(appt.total_amount)}
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-2 text-xs">
                    {appt.status === 'pending' && (
                      <button
                        type="button"
                        onClick={() => runAction(appt.id, 'confirm')}
                        className="rounded-lg border border-[#D49B6A]/50 px-3 py-1.5 text-[#D49B6A]"
                      >
                        Confirmar
                      </button>
                    )}
                    {(appt.status === 'pending' ||
                      appt.status === 'confirmed' ||
                      appt.status === 'in_progress') && (
                      <>
                        <button
                          type="button"
                          onClick={() => runAction(appt.id, 'complete')}
                          className="inline-flex items-center gap-1 rounded-lg bg-[#45C486] px-3 py-1.5 font-bold text-[#0E0906]"
                        >
                          <Check className="h-3.5 w-3.5" /> Concluir & Receber
                        </button>
                        <button
                          type="button"
                          onClick={() => setRescheduleTargetId(appt.id)}
                          className="inline-flex items-center gap-1 rounded-lg border border-white/15 px-3 py-1.5"
                        >
                          <RefreshCw className="h-3.5 w-3.5" /> Remarcar
                        </button>
                        <button
                          type="button"
                          onClick={() => runAction(appt.id, 'no_show')}
                          className="inline-flex items-center gap-1 rounded-lg border border-white/15 px-3 py-1.5 text-[#B59E8D]"
                        >
                          <UserX className="h-3.5 w-3.5" /> Faltou
                        </button>
                        <button
                          type="button"
                          onClick={() => runAction(appt.id, 'cancel')}
                          className="inline-flex items-center gap-1 rounded-lg border border-[#E06258]/40 px-3 py-1.5 text-[#E06258]"
                        >
                          <X className="h-3.5 w-3.5" /> Cancelar
                        </button>
                      </>
                    )}
                  </div>
                </div>

                {rescheduleTargetId === appt.id && (
                  <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-white/10 pt-3 text-xs">
                    <input
                      type="date"
                      value={rescheduleDate}
                      onChange={(e) => setRescheduleDate(e.target.value)}
                      className="rounded border border-white/10 bg-[#0E0906] px-2.5 py-1.5"
                    />
                    <input
                      type="time"
                      value={rescheduleTime}
                      onChange={(e) => setRescheduleTime(e.target.value)}
                      className="rounded border border-white/10 bg-[#0E0906] px-2.5 py-1.5"
                    />
                    <button
                      type="button"
                      onClick={() => runAction(appt.id, 'reschedule')}
                      className="rounded bg-[#D49B6A] px-3 py-1.5 font-bold text-[#0E0906]"
                    >
                      Salvar Novo Horário
                    </button>
                    <button
                      type="button"
                      onClick={() => setRescheduleTargetId(null)}
                      className="text-[#B59E8D]"
                    >
                      Cancelar
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Lista de Espera Automática */}
        <div className="rounded-xl border border-white/10 bg-[#18100C] p-5">
          <h2 className="text-sm font-semibold text-[#F7EFE6]">
            Fila da Lista de Espera ({data.waitlistEntries.length})
          </h2>
          <div className="mt-3 space-y-2 text-xs">
            {data.waitlistEntries.map((w) => (
              <div
                key={w.id}
                className="flex items-center justify-between rounded-lg border border-white/5 bg-[#0E0906] px-3 py-2"
              >
                <span>
                  {data.customers.find((c) => c.id === w.customer_id)?.full_name} — Data desejada:{' '}
                  {w.desired_date.split('-').reverse().join('/')}
                </span>
                <span className="rounded bg-[#D49B6A]/15 px-2 py-0.5 text-[10px] font-bold uppercase text-[#D49B6A]">
                  {w.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </PermissionGuard>
  );
}
