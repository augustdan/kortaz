'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { AlertCircle, KeyRound, Lock, Mail } from 'lucide-react';
import { BrandLogo } from '@/components/ui/BrandLogo';

const DEMO_ACCOUNTS = [
  {
    label: 'Proprietário (Exclusiva)',
    email: 'dono@exclusiva.com.br',
    redirect: '/app',
    badge: 'OWNER',
  },
  {
    label: 'Gerente',
    email: 'gerente@exclusiva.com.br',
    redirect: '/app',
    badge: 'MANAGER',
  },
  {
    label: 'Barbeiro (Lucas)',
    email: 'lucas@exclusiva.com.br',
    redirect: '/app/agenda',
    badge: 'BARBER',
  },
  {
    label: 'Recepcionista',
    email: 'recepcao@exclusiva.com.br',
    redirect: '/app/agendamentos',
    badge: 'RECEPTIONIST',
  },
  {
    label: 'Outro Tenant (Navalha)',
    email: 'dono@navalha.com.br',
    redirect: '/app',
    badge: 'ISOLAMENTO',
  },
  {
    label: 'Super Admin SaaS',
    email: 'superadmin@barberos.com.br',
    redirect: '/admin',
    badge: 'SUPER_ADMIN',
  },
];

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('dono@exclusiva.com.br');
  const [password, setPassword] = useState('BarberOS@2026');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submitLogin(targetEmail: string, targetPassword: string, redirect = '/app') {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: targetEmail, password: targetPassword }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Falha no login.');
        return;
      }
      const role = data.session?.roleCode;
      if (role === 'SUPER_ADMIN') {
        router.push('/admin');
      } else if (role === 'CUSTOMER') {
        router.push('/s/barbearia-exclusiva');
      } else {
        router.push(redirect);
      }
      router.refresh();
    } catch {
      setError('Erro de comunicação com o servidor.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen flex-col justify-center bg-[#090909] px-4 py-12 text-[#F5F1EB]">
      <div className="mx-auto w-full max-w-md rounded-2xl border border-[#292521] bg-[#151515] p-8 shadow-2xl">
        <div className="mb-6 flex justify-center">
          <BrandLogo />
        </div>

        <h1 className="text-center font-display text-3xl font-semibold">Acessar Plataforma</h1>
        <p className="mt-1 text-center text-xs text-[#A5A09A]">
          Entre com sua conta de proprietário, equipe ou super administrador.
        </p>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            submitLogin(email, password);
          }}
          className="mt-6 space-y-4"
        >
          <div>
            <label className="mb-1.5 block text-xs font-medium text-[#A5A09A]">E-mail</label>
            <div className="relative">
              <Mail className="absolute left-3 top-2.5 h-4 w-4 text-[#A5A09A]" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-lg border border-[#292521] bg-[#090909] py-2.5 pl-10 pr-3 text-sm text-[#F5F1EB] focus:border-[#D99A4E] focus:outline-none"
              />
            </div>
          </div>

          <div>
            <div className="mb-1.5 flex items-center justify-between">
              <label className="text-xs font-medium text-[#A5A09A]">Senha</label>
              <Link href="/recuperar-senha" className="text-[11px] text-[#D99A4E] hover:underline">
                Esqueceu a senha?
              </Link>
            </div>
            <div className="relative">
              <Lock className="absolute left-3 top-2.5 h-4 w-4 text-[#A5A09A]" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-lg border border-[#292521] bg-[#090909] py-2.5 pl-10 pr-3 text-sm text-[#F5F1EB] focus:border-[#D99A4E] focus:outline-none"
              />
            </div>
          </div>

          {error && (
            <div className="flex items-start gap-2 rounded-lg border border-[#EF5350]/40 bg-[#EF5350]/10 p-3 text-xs text-[#EF5350]">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-[#D99A4E] py-3 text-xs font-bold uppercase tracking-wider text-[#090909] hover:bg-[#F2B968] disabled:opacity-50"
          >
            {loading ? 'Autenticando...' : 'Entrar no Sistema'}
          </button>
        </form>

        {/* Acesso rápido para avaliar permissões e multi-tenancy */}
        <div className="mt-6 border-t border-[#292521] pt-5">
          <p className="mb-3 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-[#D99A4E]">
            <KeyRound className="h-3.5 w-3.5" />
            <span>Contas de Validação (Senha padrão: BarberOS@2026)</span>
          </p>
          <div className="grid grid-cols-2 gap-2">
            {DEMO_ACCOUNTS.map((acc) => (
              <button
                key={acc.email}
                type="button"
                disabled={loading}
                onClick={() => submitLogin(acc.email, 'BarberOS@2026', acc.redirect)}
                className="rounded-lg border border-[#292521] bg-[#090909] px-2.5 py-2 text-left transition-colors hover:border-[#D99A4E]"
              >
                <span className="block text-[10px] font-bold text-[#D99A4E]">{acc.badge}</span>
                <span className="block truncate text-xs text-[#F5F1EB]">{acc.label}</span>
              </button>
            ))}
          </div>
        </div>

        <p className="mt-6 text-center text-xs text-[#A5A09A]">
          Não tem barbearia cadastrada?{' '}
          <Link href="/cadastro" className="font-semibold text-[#D99A4E] hover:underline">
            Criar conta agora
          </Link>
        </p>
      </div>
    </div>
  );
}
