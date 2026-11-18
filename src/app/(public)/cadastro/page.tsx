'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { AlertCircle } from 'lucide-react';
import { BrandLogo } from '@/components/ui/BrandLogo';

export default function RegisterTenantPage() {
  const router = useRouter();
  const [ownerName, setOwnerName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [barbershopName, setBarbershopName] = useState('');
  const [slug, setSlug] = useState('');
  const [businessType, setBusinessType] = useState<'barbershop' | 'salon' | 'unisex'>('unisex');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('São Paulo');
  const [state, setState] = useState('SP');
  const [planCode, setPlanCode] = useState<'free' | 'starter' | 'pro' | 'premium' | 'business'>('pro');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleNameChange = (value: string) => {
    setBarbershopName(value);
    const autoSlug = value
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
    setSlug(autoSlug);
  };

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'register',
          ownerName,
          email,
          phone,
          password,
          barbershopName,
          slug,
          businessType,
          address,
          city,
          state,
          planCode,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Erro ao criar estabelecimento.');
        return;
      }
      router.push('/app');
      router.refresh();
    } catch {
      setError('Erro de conexão ao registrar estabelecimento.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#090909] px-4 py-12 text-[#F5F1EB]">
      <div className="hud-radial-glow pointer-events-none fixed inset-0" />
      <div className="hud-panel relative mx-auto max-w-xl rounded-3xl p-8">
        <div className="mb-6 flex justify-center">
          <BrandLogo />
        </div>
        <h1 className="text-center font-display text-3xl font-semibold">
          Cadastre sua Barbearia ou Salão
        </h1>
        <p className="mt-1 text-center text-xs text-[#A5A09A]">
          Ambiente multi-tenant isolado pronto para barbearias masculinas, cabeleireiras e salões.
        </p>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4 text-xs">
          <div>
            <label className="mb-1.5 block text-[#A5A09A]">Segmento do Estabelecimento</label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { key: 'barbershop', label: 'Barbearia Masculina' },
                { key: 'salon', label: 'Salão / Cabeleireira' },
                { key: 'unisex', label: 'Misto / Unissex' },
              ].map((opt) => (
                <button
                  key={opt.key}
                  type="button"
                  onClick={() => setBusinessType(opt.key as 'barbershop' | 'salon' | 'unisex')}
                  className={`rounded-xl border py-2.5 text-[11px] font-semibold transition-all ${
                    businessType === opt.key
                      ? 'border-[#D99A4E] bg-[#D99A4E] text-[#090909]'
                      : 'border-[#292521] bg-[#151515] text-[#A5A09A]'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-[#A5A09A]">Seu Nome Completo</label>
              <input
                type="text"
                required
                value={ownerName}
                onChange={(e) => setOwnerName(e.target.value)}
                placeholder="Ex: Camila ou João Pedro"
                className="w-full rounded-xl border border-[#292521] bg-[#090909] px-3 py-2.5 text-sm focus:border-[#D99A4E] focus:outline-none"
              />
            </div>
            <div>
              <label className="mb-1 block text-[#A5A09A]">WhatsApp / Telefone</label>
              <input
                type="tel"
                required
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="(11) 99999-9999"
                className="w-full rounded-xl border border-[#292521] bg-[#090909] px-3 py-2.5 text-sm focus:border-[#D99A4E] focus:outline-none"
              />
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-[#A5A09A]">E-mail de Acesso</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="contato@seustudio.com.br"
                className="w-full rounded-xl border border-[#292521] bg-[#090909] px-3 py-2.5 text-sm focus:border-[#D99A4E] focus:outline-none"
              />
            </div>
            <div>
              <label className="mb-1 block text-[#A5A09A]">Senha (mín. 6 caracteres)</label>
              <input
                type="password"
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-xl border border-[#292521] bg-[#090909] px-3 py-2.5 text-sm focus:border-[#D99A4E] focus:outline-none"
              />
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-[#A5A09A]">Nome do Espaço</label>
              <input
                type="text"
                required
                value={barbershopName}
                onChange={(e) => handleNameChange(e.target.value)}
                placeholder="Ex: Studio Kortaz"
                className="w-full rounded-xl border border-[#292521] bg-[#090909] px-3 py-2.5 text-sm focus:border-[#D99A4E] focus:outline-none"
              />
            </div>
            <div>
              <label className="mb-1 block text-[#A5A09A]">Link Público (/s/slug)</label>
              <input
                type="text"
                required
                value={slug}
                onChange={(e) => setSlug(e.target.value)}
                placeholder="studio-kortaz"
                className="w-full rounded-xl border border-[#292521] bg-[#090909] px-3 py-2.5 text-sm focus:border-[#D99A4E] focus:outline-none"
              />
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <div className="sm:col-span-2">
              <label className="mb-1 block text-[#A5A09A]">Endereço da Matriz</label>
              <input
                type="text"
                required
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="Rua Augusta, 500"
                className="w-full rounded-xl border border-[#292521] bg-[#090909] px-3 py-2.5 text-sm focus:border-[#D99A4E] focus:outline-none"
              />
            </div>
            <div className="grid grid-cols-3 gap-2">
              <div className="col-span-2">
                <label className="mb-1 block text-[#A5A09A]">Cidade</label>
                <input
                  type="text"
                  required
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  className="w-full rounded-xl border border-[#292521] bg-[#090909] px-2.5 py-2.5 text-sm focus:border-[#D99A4E] focus:outline-none"
                />
              </div>
              <div>
                <label className="mb-1 block text-[#A5A09A]">UF</label>
                <input
                  type="text"
                  required
                  maxLength={2}
                  value={state}
                  onChange={(e) => setState(e.target.value.toUpperCase())}
                  className="w-full rounded-xl border border-[#292521] bg-[#090909] px-2 py-2.5 text-center text-sm focus:border-[#D99A4E] focus:outline-none"
                />
              </div>
            </div>
          </div>

          <div>
            <label className="mb-1 block text-[#A5A09A]">Plano Inicial</label>
            <select
              value={planCode}
              onChange={(e) =>
                setPlanCode(e.target.value as 'free' | 'starter' | 'pro' | 'premium' | 'business')
              }
              className="w-full rounded-xl border border-[#292521] bg-[#090909] px-3 py-2.5 text-sm focus:border-[#D99A4E] focus:outline-none"
            >
              <option value="free">Plano Gratuito — R$ 0/mês (1 profissional, 30 agendamentos/mês)</option>
              <option value="starter">Plano Starter — R$ 29,90/mês (14 dias grátis)</option>
              <option value="pro">Plano Pro — R$ 59,90/mês (14 dias grátis • Mais Popular)</option>
              <option value="premium">Plano Premium — R$ 99,90/mês (14 dias grátis)</option>
              <option value="business">Plano Business — R$ 199,90/mês (Multiunidades)</option>
            </select>
          </div>

          {error && (
            <div className="flex items-start gap-2 rounded-xl border border-[#EF5350]/40 bg-[#EF5350]/10 p-3 text-xs text-[#EF5350]">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-full bg-[#D99A4E] py-3.5 text-xs font-bold uppercase tracking-wider text-[#090909] hover:bg-[#F2B968] disabled:opacity-50"
          >
            {loading ? 'Provisionando Ambiente...' : 'Criar Meu Espaço na Kortaz'}
          </button>
        </form>

        <p className="mt-5 text-center text-xs text-[#A5A09A]">
          Já possui conta?{' '}
          <Link href="/login" className="text-[#D99A4E] hover:underline">
            Fazer login
          </Link>
        </p>
      </div>
    </div>
  );
}
