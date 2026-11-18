'use client';

import { useState } from 'react';
import Link from 'next/link';
import { BrandLogo } from '@/components/ui/BrandLogo';

export default function PasswordResetPage() {
  const [email, setEmail] = useState('');
  const [token, setToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [step, setStep] = useState<'request' | 'confirm' | 'done'>('request');
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleRequest(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const res = await fetch('/api/auth', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'password_reset_request', email }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error);
      return;
    }
    setMessage(
      data.previewToken
        ? `Token gerado (RESEND_API_KEY não configurada): ${data.previewToken}`
        : data.message
    );
    if (data.previewToken) setToken(data.previewToken);
    setStep('confirm');
  }

  async function handleConfirm(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const res = await fetch('/api/auth', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'password_reset_confirm', token, newPassword }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error);
      return;
    }
    setStep('done');
  }

  return (
    <div className="flex min-h-screen flex-col justify-center bg-[#090909] px-4 py-12 text-[#F5F1EB]">
      <div className="mx-auto w-full max-w-md rounded-2xl border border-[#292521] bg-[#151515] p-8">
        <div className="mb-6 flex justify-center">
          <BrandLogo />
        </div>
        <h1 className="text-center font-display text-3xl font-semibold">Recuperar Senha</h1>

        {step === 'request' && (
          <form onSubmit={handleRequest} className="mt-6 space-y-4 text-xs">
            <div>
              <label className="mb-1 block text-[#A5A09A]">E-mail cadastrado</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-lg border border-[#292521] bg-[#090909] px-3 py-2.5 text-sm"
              />
            </div>
            {error && <p className="text-[#EF5350]">{error}</p>}
            <button
              type="submit"
              className="w-full rounded-lg bg-[#D99A4E] py-3 font-bold uppercase text-[#090909]"
            >
              Solicitar Redefinição
            </button>
          </form>
        )}

        {step === 'confirm' && (
          <form onSubmit={handleConfirm} className="mt-6 space-y-4 text-xs">
            {message && (
              <div className="rounded-lg border border-[#D99A4E]/30 bg-[#090909] p-3 break-all text-[#D99A4E]">
                {message}
              </div>
            )}
            <div>
              <label className="mb-1 block text-[#A5A09A]">Token de verificação</label>
              <input
                type="text"
                required
                value={token}
                onChange={(e) => setToken(e.target.value)}
                className="w-full rounded-lg border border-[#292521] bg-[#090909] px-3 py-2.5 text-sm"
              />
            </div>
            <div>
              <label className="mb-1 block text-[#A5A09A]">Nova senha</label>
              <input
                type="password"
                required
                minLength={6}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full rounded-lg border border-[#292521] bg-[#090909] px-3 py-2.5 text-sm"
              />
            </div>
            {error && <p className="text-[#EF5350]">{error}</p>}
            <button
              type="submit"
              className="w-full rounded-lg bg-[#D99A4E] py-3 font-bold uppercase text-[#090909]"
            >
              Salvar Nova Senha
            </button>
          </form>
        )}

        {step === 'done' && (
          <div className="mt-6 space-y-4 text-center text-sm">
            <p className="text-[#16C784]">Senha alterada com sucesso!</p>
            <Link
              href="/login"
              className="block rounded-lg bg-[#D99A4E] py-2.5 text-xs font-bold uppercase text-[#090909]"
            >
              Ir para Login
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
