'use client';

import { useState } from 'react';
import { useAdminData } from '@/components/admin/AdminShell';

export default function AdminSettingsPage() {
  const { data, refresh } = useAdminData();
  const [supportEmail, setSupportEmail] = useState(data?.platformSettings.support_email || '');
  const [trialDays, setTrialDays] = useState(data?.platformSettings.default_trial_days ?? 14);
  const [saved, setSaved] = useState(false);

  if (!data) return null;

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaved(false);
    const res = await fetch('/api/admin', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'update_platform_settings',
        supportEmail: supportEmail || data!.platformSettings.support_email,
        defaultTrialDays: Number(trialDays),
      }),
    });
    if (res.ok) {
      setSaved(true);
      await refresh();
    }
  }

  return (
    <div className="space-y-6">
      <h1 className="font-serif text-3xl font-semibold">Configurações Globais & Integrações</h1>

      <form
        onSubmit={handleSave}
        className="rounded-xl border border-white/10 bg-[#18100C] p-5 space-y-4 text-xs"
      >
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-[#B59E8D]">E-mail de Suporte da Plataforma</label>
            <input
              type="email"
              defaultValue={data.platformSettings.support_email}
              onChange={(e) => setSupportEmail(e.target.value)}
              className="w-full rounded border border-white/10 bg-[#0E0906] px-3 py-2"
            />
          </div>
          <div>
            <label className="mb-1 block text-[#B59E8D]">Dias padrão de Teste Gratuito</label>
            <input
              type="number"
              defaultValue={data.platformSettings.default_trial_days}
              onChange={(e) => setTrialDays(Number(e.target.value))}
              className="w-full rounded border border-white/10 bg-[#0E0906] px-3 py-2"
            />
          </div>
        </div>
        <button
          type="submit"
          className="rounded-lg bg-[#D49B6A] px-5 py-2 font-bold text-[#0E0906]"
        >
          Salvar Configurações Globais
        </button>
        {saved && <span className="ml-3 text-[#45C486]">Salvo!</span>}
      </form>

      <div className="rounded-xl border border-white/10 bg-[#18100C] p-5">
        <h2 className="text-sm font-semibold">Monitoramento de Falhas de Integração</h2>
        <div className="mt-3 space-y-2 text-xs">
          {data.notificationFailures.length === 0 ? (
            <p className="text-[#45C486]">Nenhuma falha de integração registrada.</p>
          ) : (
            data.notificationFailures.map((job) => (
              <div key={job.id} className="rounded border border-white/5 bg-[#0E0906] p-3">
                <span className="font-bold text-[#D49B6A]">{job.status}</span> &bull;{' '}
                {job.trigger_event} &bull; {job.last_error}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
