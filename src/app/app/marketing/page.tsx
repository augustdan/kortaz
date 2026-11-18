'use client';

import { useState } from 'react';
import { AlertCircle, Gift, MessageSquare, RefreshCw, Tag } from 'lucide-react';
import { useWorkspace } from '@/components/app/TenantWorkspaceContext';
import { PermissionGuard } from '@/components/app/PermissionGuard';
import { formatDateTimeBR } from '@/lib/utils';

export default function MarketingAutomationsPage() {
  const { data, refresh } = useWorkspace();
  const [couponCode, setCouponCode] = useState('');
  const [couponValue, setCouponValue] = useState(15);
  const [couponDesc, setCouponDesc] = useState('Campanha Fidelidade');
  const [editingTplId, setEditingTplId] = useState<string | null>(null);
  const [editingBody, setEditingBody] = useState('');
  const [feedback, setFeedback] = useState<string | null>(null);

  if (!data) return null;

  async function handleToggleTemplate(templateId: string, isActive: boolean) {
    await fetch('/api/notifications', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'update_template',
        tenantId: data!.tenant.id,
        templateId,
        isActive,
      }),
    });
    await refresh();
  }

  async function handleSaveTemplate(templateId: string) {
    await fetch('/api/notifications', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'update_template',
        tenantId: data!.tenant.id,
        templateId,
        bodyTemplate: editingBody,
      }),
    });
    setEditingTplId(null);
    setFeedback('Template de automação atualizado.');
    await refresh();
  }

  async function handleCreateCoupon(e: React.FormEvent) {
    e.preventDefault();
    const res = await fetch('/api/notifications', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'create_coupon',
        tenantId: data!.tenant.id,
        code: couponCode,
        discountType: 'percentage',
        discountValue: Number(couponValue),
        description: couponDesc,
      }),
    });
    if (res.ok) {
      setCouponCode('');
      setFeedback('Cupom promocional criado e pronto para uso no agendamento!');
      await refresh();
    }
  }

  async function handleRetryJob(jobId: string) {
    await fetch('/api/notifications', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'retry_job',
        tenantId: data!.tenant.id,
        jobId,
      }),
    });
    await refresh();
  }

  return (
    <PermissionGuard resource="marketing">
      <div className="space-y-6">
        <div>
          <h1 className="font-serif text-3xl font-semibold">WhatsApp, Fidelidade & Marketing</h1>
          <p className="text-xs text-[#B59E8D]">
            Automações configuráveis, cartão fidelidade digital, cashback e cupons de retorno.
          </p>
        </div>

        {/* Status transparente das integrações de mensageria */}
        {!data.integrationsStatus.whatsappConfigured && (
          <div className="flex items-start gap-3 rounded-xl border border-[#D49B6A]/40 bg-[#D49B6A]/10 p-4 text-xs">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-[#D49B6A]" />
            <div>
              <p className="font-bold text-[#F7EFE6]">
                WhatsApp Business API aguardando credenciais externas
              </p>
              <p className="mt-1 text-[#B59E8D]">
                Os disparos não são simulados falsamente. Todas as mensagens são enfileiradas em{' '}
                <code>notification_jobs</code> com status{' '}
                <code>integration_not_configured</code> até que <code>WHATSAPP_API_TOKEN</code> e{' '}
                <code>WHATSAPP_PHONE_NUMBER_ID</code> sejam configurados no ambiente.
              </p>
            </div>
          </div>
        )}

        {feedback && <p className="text-xs text-[#45C486]">{feedback}</p>}

        {/* Templates Editáveis de Automação */}
        <div className="rounded-xl border border-white/10 bg-[#18100C] p-5 space-y-4">
          <div className="flex items-center gap-2 text-sm font-semibold">
            <MessageSquare className="h-4 w-4 text-[#D49B6A]" />
            <span>Centro de Automações & Templates</span>
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            {data.notificationTemplates.map((tpl) => (
              <div
                key={tpl.id}
                className="rounded-xl border border-white/10 bg-[#0E0906] p-4 space-y-2.5 text-xs"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-bold text-[#F7EFE6]">{tpl.title}</p>
                    <p className="text-[10px] uppercase text-[#D49B6A]">
                      {tpl.trigger_event} &bull; {tpl.channel}
                    </p>
                  </div>
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={tpl.is_active}
                      onChange={(e) => handleToggleTemplate(tpl.id, e.target.checked)}
                      className="accent-[#D49B6A]"
                    />
                    <span className="text-[11px]">{tpl.is_active ? 'Ativa' : 'Pausada'}</span>
                  </label>
                </div>

                {editingTplId === tpl.id ? (
                  <div className="space-y-2">
                    <textarea
                      rows={3}
                      value={editingBody}
                      onChange={(e) => setEditingBody(e.target.value)}
                      className="w-full rounded border border-white/15 bg-[#18100C] p-2 text-xs"
                    />
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => handleSaveTemplate(tpl.id)}
                        className="rounded bg-[#D49B6A] px-3 py-1 font-bold text-[#0E0906]"
                      >
                        Salvar
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditingTplId(null)}
                        className="text-[#B59E8D]"
                      >
                        Cancelar
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-[#B59E8D]">{tpl.body_template}</p>
                    <button
                      type="button"
                      onClick={() => {
                        setEditingTplId(tpl.id);
                        setEditingBody(tpl.body_template);
                      }}
                      className="shrink-0 text-[#D49B6A] underline"
                    >
                      Editar
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Fidelidade & Cupons */}
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="rounded-xl border border-white/10 bg-[#18100C] p-5 space-y-4">
            <h2 className="flex items-center gap-2 text-sm font-semibold">
              <Gift className="h-4 w-4 text-[#D49B6A]" />
              <span>Programa de Fidelidade & Cashback</span>
            </h2>
            <div className="rounded-lg bg-[#0E0906] p-4 text-xs space-y-1.5">
              <p>
                <strong className="text-[#D49B6A]">Regra do Cartão Digital:</strong> A cada{' '}
                <strong>{data.settings.loyalty_cuts_target} atendimentos</strong>, o cliente ganha:{' '}
                <strong>{data.settings.loyalty_reward_label}</strong>.
              </p>
              <p>
                <strong className="text-[#45C486]">Cashback ativo:</strong>{' '}
                {data.settings.cashback_percent}% acumulado em cada serviço concluído.
              </p>
            </div>
            <div className="space-y-2 text-xs">
              {data.loyaltyAccounts.map((acc) => {
                const cust = data.customers.find((c) => c.id === acc.customer_id);
                return (
                  <div
                    key={acc.id}
                    className="flex items-center justify-between rounded border border-white/5 bg-[#0E0906] px-3 py-2"
                  >
                    <span>
                      <strong>{cust?.full_name}</strong> (Cód. Indicação:{' '}
                      <code className="text-[#D49B6A]">{acc.referral_code}</code>)
                    </span>
                    <span className="text-[#D49B6A]">
                      {acc.stamps_balance}/{data.settings.loyalty_cuts_target} selos &bull;{' '}
                      {acc.points_balance} pts
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="rounded-xl border border-white/10 bg-[#18100C] p-5 space-y-4">
            <h2 className="flex items-center gap-2 text-sm font-semibold">
              <Tag className="h-4 w-4 text-[#D49B6A]" />
              <span>Cupons Promocionais da Barbearia</span>
            </h2>
            <form onSubmit={handleCreateCoupon} className="grid grid-cols-3 gap-2 text-xs">
              <input
                type="text"
                required
                placeholder="Código (EX: VIP20)"
                value={couponCode}
                onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                className="rounded border border-white/10 bg-[#0E0906] px-3 py-2 uppercase"
              />
              <input
                type="number"
                min={1}
                max={100}
                value={couponValue}
                onChange={(e) => setCouponValue(Number(e.target.value))}
                className="rounded border border-white/10 bg-[#0E0906] px-3 py-2"
              />
              <button
                type="submit"
                className="rounded bg-[#D49B6A] font-bold text-[#0E0906]"
              >
                Criar Cupom %
              </button>
            </form>
            <div className="space-y-2 text-xs">
              {data.coupons.map((c) => (
                <div
                  key={c.id}
                  className="flex items-center justify-between rounded border border-white/5 bg-[#0E0906] px-3 py-2"
                >
                  <div>
                    <strong className="text-[#D49B6A]">{c.code}</strong> &mdash; {c.description}
                  </div>
                  <span className="text-[#B59E8D]">
                    {c.discount_value}% OFF ({c.used_count} uso(s))
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Fila de Mensagens e Logs */}
        <div className="rounded-xl border border-white/10 bg-[#18100C] p-5">
          <h2 className="text-sm font-semibold">Fila de Disparos & Logs ({data.notificationJobs.length})</h2>
          <div className="mt-3 space-y-2 text-xs">
            {data.notificationJobs.length === 0 ? (
              <p className="text-[#B59E8D]">Nenhum disparo registrado ainda.</p>
            ) : (
              data.notificationJobs.slice(0, 12).map((job) => (
                <div
                  key={job.id}
                  className="flex flex-wrap items-center justify-between gap-2 rounded border border-white/5 bg-[#0E0906] px-3 py-2.5"
                >
                  <div>
                    <span className="font-semibold text-[#F7EFE6]">{job.recipient}</span> &bull;{' '}
                    <span className="text-[#D49B6A]">{job.trigger_event}</span>
                    <p className="text-[11px] text-[#B59E8D]">{job.rendered_message}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="rounded bg-[#18100C] px-2 py-0.5 text-[10px] uppercase text-[#D49B6A]">
                      {job.status}
                    </span>
                    <span className="text-[#B59E8D]">{formatDateTimeBR(job.created_at)}</span>
                    {(job.status === 'failed' || job.status === 'integration_not_configured') && (
                      <button
                        type="button"
                        onClick={() => handleRetryJob(job.id)}
                        className="inline-flex items-center gap-1 rounded border border-white/15 px-2 py-1 text-[10px]"
                      >
                        <RefreshCw className="h-3 w-3" /> Reenviar
                      </button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </PermissionGuard>
  );
}
