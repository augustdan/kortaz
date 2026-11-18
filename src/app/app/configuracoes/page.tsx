'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Building2, Key, Plus, Shield } from 'lucide-react';
import { useWorkspace } from '@/components/app/TenantWorkspaceContext';
import { PermissionGuard } from '@/components/app/PermissionGuard';

export default function SettingsPage() {
  const { data, refresh } = useWorkspace();
  const [barbershopName, setBarbershopName] = useState(data?.tenant.name || '');
  const [headline, setHeadline] = useState(data?.settings.custom_public_headline || '');
  const [cancelHours, setCancelHours] = useState(data?.settings.cancellation_policy_hours ?? 4);
  const [branchName, setBranchName] = useState('');
  const [branchAddress, setBranchAddress] = useState('');
  const [branchCity, setBranchCity] = useState('São Paulo');
  const [branchState, setBranchState] = useState('SP');
  const [branchPhone, setBranchPhone] = useState('');
  const [feedback, setFeedback] = useState<string | null>(null);
  const [branchError, setBranchError] = useState<string | null>(null);

  if (!data) return null;

  async function handleSaveSettings(e: React.FormEvent) {
    e.preventDefault();
    setFeedback(null);
    const res = await fetch('/api/admin', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'update_tenant_settings',
        tenantId: data!.tenant.id,
        name: barbershopName || data!.tenant.name,
        customPublicHeadline: headline || data!.settings.custom_public_headline,
        cancellationPolicyHours: Number(cancelHours),
      }),
    });
    if (res.ok) {
      setFeedback('Configurações salvas com sucesso!');
      await refresh();
    }
  }

  async function handleCreateBranch(e: React.FormEvent) {
    e.preventDefault();
    setBranchError(null);
    const res = await fetch('/api/admin', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'create_branch',
        tenantId: data!.tenant.id,
        name: branchName,
        address: branchAddress,
        city: branchCity,
        state: branchState,
        phone: branchPhone,
      }),
    });
    const json = await res.json();
    if (!res.ok) {
      setBranchError(json.error);
      return;
    }
    setBranchName('');
    setBranchAddress('');
    setBranchPhone('');
    await refresh();
  }

  async function togglePermission(
    permissionId: string,
    field: 'canView' | 'canCreate' | 'canEdit' | 'canDelete',
    nextVal: boolean
  ) {
    await fetch('/api/admin', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'update_permission',
        tenantId: data!.tenant.id,
        permissionId,
        [field]: nextVal,
      }),
    });
    await refresh();
  }

  return (
    <PermissionGuard resource="settings">
      <div className="space-y-6">
        <div>
          <h1 className="font-serif text-3xl font-semibold">Configurações, Multiunidades & RBAC</h1>
          <p className="text-xs text-[#B59E8D]">
            Personalização da página pública, cadastro de filiais e permissões granulares por cargo.
          </p>
        </div>

        {/* Dados Gerais */}
        <form
          onSubmit={handleSaveSettings}
          className="rounded-xl border border-white/10 bg-[#18100C] p-5 space-y-4 text-xs"
        >
          <h2 className="text-sm font-semibold text-[#F7EFE6]">Identidade & Políticas</h2>
          <div className="grid gap-3 sm:grid-cols-3">
            <div>
              <label className="mb-1 block text-[#B59E8D]">Nome da Barbearia</label>
              <input
                type="text"
                defaultValue={data.tenant.name}
                onChange={(e) => setBarbershopName(e.target.value)}
                className="w-full rounded-lg border border-white/10 bg-[#0E0906] px-3 py-2"
              />
            </div>
            <div>
              <label className="mb-1 block text-[#B59E8D]">Título do Banner Público</label>
              <input
                type="text"
                defaultValue={data.settings.custom_public_headline}
                onChange={(e) => setHeadline(e.target.value)}
                className="w-full rounded-lg border border-white/10 bg-[#0E0906] px-3 py-2"
              />
            </div>
            <div>
              <label className="mb-1 block text-[#B59E8D]">Antecedência mínima p/ cancelar (h)</label>
              <input
                type="number"
                min={0}
                defaultValue={data.settings.cancellation_policy_hours}
                onChange={(e) => setCancelHours(Number(e.target.value))}
                className="w-full rounded-lg border border-white/10 bg-[#0E0906] px-3 py-2"
              />
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              type="submit"
              className="rounded-lg bg-[#D49B6A] px-5 py-2 font-bold text-[#0E0906]"
            >
              Salvar Preferências
            </button>
            {feedback && <span className="text-[#45C486]">{feedback}</span>}
          </div>
        </form>

        {/* Gestão de Unidades / Filiais */}
        <div className="rounded-xl border border-white/10 bg-[#18100C] p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-sm font-semibold">
              <Building2 className="h-4 w-4 text-[#D49B6A]" />
              <span>Unidades / Filiais ({data.branches.length}/{data.plan.max_branches})</span>
            </h2>
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            {data.branches.map((b) => (
              <div key={b.id} className="rounded-lg border border-white/10 bg-[#0E0906] p-3 text-xs">
                <p className="font-bold text-[#F7EFE6]">
                  {b.name} {b.is_headquarters && <span className="text-[#D49B6A]">(Matriz)</span>}
                </p>
                <p className="text-[#B59E8D]">
                  {b.address} — {b.city}/{b.state} &bull; {b.phone}
                </p>
              </div>
            ))}
          </div>

          <form onSubmit={handleCreateBranch} className="grid gap-2 sm:grid-cols-6 text-xs">
            <input
              type="text"
              required
              placeholder="Nome da filial"
              value={branchName}
              onChange={(e) => setBranchName(e.target.value)}
              className="rounded border border-white/10 bg-[#0E0906] px-3 py-2"
            />
            <input
              type="text"
              required
              placeholder="Endereço"
              value={branchAddress}
              onChange={(e) => setBranchAddress(e.target.value)}
              className="rounded border border-white/10 bg-[#0E0906] px-3 py-2"
            />
            <input
              type="text"
              required
              placeholder="Cidade"
              value={branchCity}
              onChange={(e) => setBranchCity(e.target.value)}
              className="rounded border border-white/10 bg-[#0E0906] px-3 py-2"
            />
            <input
              type="text"
              required
              maxLength={2}
              placeholder="UF"
              value={branchState}
              onChange={(e) => setBranchState(e.target.value.toUpperCase())}
              className="rounded border border-white/10 bg-[#0E0906] px-3 py-2"
            />
            <input
              type="tel"
              required
              placeholder="Telefone"
              value={branchPhone}
              onChange={(e) => setBranchPhone(e.target.value)}
              className="rounded border border-white/10 bg-[#0E0906] px-3 py-2"
            />
            <button
              type="submit"
              className="inline-flex items-center justify-center gap-1 rounded bg-[#D49B6A] font-bold text-[#0E0906]"
            >
              <Plus className="h-3.5 w-3.5" /> Nova Filial
            </button>
          </form>

          {branchError && (
            <div className="flex items-center justify-between rounded border border-[#E06258]/40 bg-[#E06258]/10 p-3 text-xs text-[#E06258]">
              <span>{branchError}</span>
              <Link
                href="/app/assinatura"
                className="rounded bg-[#D49B6A] px-3 py-1 font-bold text-[#0E0906]"
              >
                Ver Planos
              </Link>
            </div>
          )}
        </div>

        {/* Status Real das Credenciais de Integração */}
        <div className="rounded-xl border border-white/10 bg-[#18100C] p-5 space-y-3 text-xs">
          <h2 className="flex items-center gap-2 text-sm font-semibold">
            <Key className="h-4 w-4 text-[#D49B6A]" /> Integrações Externas (Variáveis de Ambiente)
          </h2>
          <div className="grid gap-3 sm:grid-cols-3">
            {[
              {
                name: 'Mercado Pago (Pix & Cartão)',
                ok: data.integrationsStatus.mercadopagoConfigured,
                vars: 'MERCADO_PAGO_ACCESS_TOKEN, MERCADO_PAGO_WEBHOOK_SECRET',
              },
              {
                name: 'WhatsApp Business API',
                ok: data.integrationsStatus.whatsappConfigured,
                vars: 'WHATSAPP_API_TOKEN, WHATSAPP_PHONE_NUMBER_ID',
              },
              {
                name: 'Resend (E-mail Transacional)',
                ok: data.integrationsStatus.resendConfigured,
                vars: 'RESEND_API_KEY, RESEND_FROM_EMAIL',
              },
            ].map((int) => (
              <div key={int.name} className="rounded-lg border border-white/10 bg-[#0E0906] p-3">
                <div className="flex items-center justify-between">
                  <strong className="text-[#F7EFE6]">{int.name}</strong>
                  <span
                    className={`rounded px-2 py-0.5 text-[10px] font-bold ${
                      int.ok
                        ? 'bg-[#45C486]/15 text-[#45C486]'
                        : 'bg-[#D49B6A]/15 text-[#D49B6A]'
                    }`}
                  >
                    {int.ok ? 'Configurado' : 'Aguardando .env'}
                  </span>
                </div>
                <p className="mt-1.5 font-mono text-[10px] text-[#B59E8D]">{int.vars}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Matriz Configurável de Permissões RBAC */}
        <div className="overflow-x-auto rounded-xl border border-white/10 bg-[#18100C] p-5">
          <h2 className="mb-4 flex items-center gap-2 text-sm font-semibold">
            <Shield className="h-4 w-4 text-[#D49B6A]" /> Matriz de Permissões Configurável (RBAC)
          </h2>
          <table className="w-full text-left text-xs">
            <thead className="border-b border-white/10 text-[#B59E8D]">
              <tr>
                <th className="py-2 pr-4">Perfil</th>
                <th className="py-2 pr-4">Módulo</th>
                <th className="py-2 text-center">Visualizar</th>
                <th className="py-2 text-center">Criar</th>
                <th className="py-2 text-center">Editar</th>
                <th className="py-2 text-center">Excluir</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {data.permissions.slice(0, 28).map((perm) => {
                const role = data.roles.find((r) => r.id === perm.role_id);
                return (
                  <tr key={perm.id}>
                    <td className="py-2 pr-4 font-semibold text-[#D49B6A]">{role?.name}</td>
                    <td className="py-2 pr-4 capitalize">{perm.resource}</td>
                    <td className="py-2 text-center">
                      <input
                        type="checkbox"
                        checked={perm.can_view}
                        onChange={(e) => togglePermission(perm.id, 'canView', e.target.checked)}
                        className="accent-[#D49B6A]"
                      />
                    </td>
                    <td className="py-2 text-center">
                      <input
                        type="checkbox"
                        checked={perm.can_create}
                        onChange={(e) => togglePermission(perm.id, 'canCreate', e.target.checked)}
                        className="accent-[#D49B6A]"
                      />
                    </td>
                    <td className="py-2 text-center">
                      <input
                        type="checkbox"
                        checked={perm.can_edit}
                        onChange={(e) => togglePermission(perm.id, 'canEdit', e.target.checked)}
                        className="accent-[#D49B6A]"
                      />
                    </td>
                    <td className="py-2 text-center">
                      <input
                        type="checkbox"
                        checked={perm.can_delete}
                        onChange={(e) => togglePermission(perm.id, 'canDelete', e.target.checked)}
                        className="accent-[#D49B6A]"
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </PermissionGuard>
  );
}
