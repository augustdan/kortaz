'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Download, ShieldCheck, Trash2 } from 'lucide-react';
import { BrandLogo } from '@/components/ui/BrandLogo';

export default function PrivacyLgpdPage() {
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [whatsappOptIn, setWhatsappOptIn] = useState(true);
  const [feedback, setFeedback] = useState<string | null>(null);

  async function handleExport() {
    setFeedback(null);
    const res = await fetch('/api/lgpd', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'export', email, phone }),
    });
    const data = await res.json();
    if (!res.ok) {
      setFeedback(data.error);
      return;
    }
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `meus-dados-barberos-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    setFeedback(`Exportação concluída (${data.customers.length} registro(s) localizado(s)).`);
  }

  async function handleConsentUpdate(nextOptIn: boolean) {
    setWhatsappOptIn(nextOptIn);
    const res = await fetch('/api/lgpd', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'update_consent',
        email,
        phone,
        whatsappOptIn: nextOptIn,
        marketingOptIn: nextOptIn,
      }),
    });
    const data = await res.json();
    setFeedback(
      res.ok
        ? `Preferências de comunicação atualizadas em ${data.updatedRecords} registro(s).`
        : data.error
    );
  }

  async function handleAnonymize() {
    const res = await fetch('/api/lgpd', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'anonymize', email, phone }),
    });
    const data = await res.json();
    setFeedback(res.ok ? data.message : data.error);
  }

  return (
    <div className="min-h-screen bg-[#090909] text-[#F5F1EB]">
      <header className="border-b border-[#292521]/70 px-6 py-4">
        <div className="mx-auto flex max-w-4xl items-center justify-between">
          <BrandLogo />
          <Link href="/" className="text-xs text-[#D99A4E] hover:underline">
            Voltar ao início
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-4xl space-y-8 px-6 py-12">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.25em] text-[#D99A4E]">
            CONFORMIDADE LGPD (LEI Nº 13.709/2018)
          </p>
          <h1 className="mt-2 font-display text-4xl font-semibold">
            Política de Privacidade e Portal do Titular
          </h1>
          <p className="mt-3 text-sm leading-relaxed text-[#A5A09A]">
            Cada barbearia opera em ambiente multi-tenant isolado via Row Level Security (RLS).
            Utilizamos seus dados estritamente para agendamento, faturamento e lembretes
            autorizados. Você pode exportar seus dados, revogar consentimento de mensagens ou
            solicitar anonimização abaixo.
          </p>
        </div>

        <div className="rounded-2xl border border-[#292521] bg-[#151515] p-6 space-y-4">
          <div className="flex items-center gap-2 text-sm font-semibold text-[#D99A4E]">
            <ShieldCheck className="h-5 w-5" />
            <span>Autoatendimento de Direitos LGPD</span>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <input
              type="email"
              placeholder="Seu e-mail cadastrado"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="rounded-lg border border-[#292521] bg-[#090909] px-3 py-2.5 text-sm"
            />
            <input
              type="tel"
              placeholder="Ou telefone cadastrado"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="rounded-lg border border-[#292521] bg-[#090909] px-3 py-2.5 text-sm"
            />
          </div>

          <div className="flex flex-wrap gap-3 pt-2">
            <button
              type="button"
              onClick={handleExport}
              className="inline-flex items-center gap-2 rounded-lg bg-[#D99A4E] px-4 py-2.5 text-xs font-bold text-[#090909]"
            >
              <Download className="h-4 w-4" />
              <span>Exportar Meus Dados (JSON)</span>
            </button>
            <button
              type="button"
              onClick={() => handleConsentUpdate(!whatsappOptIn)}
              className="rounded-lg border border-[#292521] px-4 py-2.5 text-xs font-semibold hover:border-[#D99A4E]"
            >
              {whatsappOptIn ? 'Ativar Opt-Out (Parar Mensagens)' : 'Reativar Consentimento WhatsApp'}
            </button>
            <button
              type="button"
              onClick={handleAnonymize}
              className="inline-flex items-center gap-2 rounded-lg border border-[#EF5350]/40 bg-[#EF5350]/10 px-4 py-2.5 text-xs font-semibold text-[#EF5350]"
            >
              <Trash2 className="h-4 w-4" />
              <span>Solicitar Exclusão / Anonimização</span>
            </button>
          </div>

          {feedback && <p className="text-xs text-[#D99A4E]">{feedback}</p>}
        </div>
      </main>
    </div>
  );
}
