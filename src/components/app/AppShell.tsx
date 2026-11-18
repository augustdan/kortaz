'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  BarChart3,
  Building2,
  Calendar,
  CalendarDays,
  Coins,
  CreditCard,
  ExternalLink,
  LayoutDashboard,
  LogOut,
  Megaphone,
  Menu,
  Package,
  Scissors,
  Settings,
  ShieldAlert,
  UserCheck,
  Users,
  Wallet,
  X,
} from 'lucide-react';
import { useWorkspace } from '@/components/app/TenantWorkspaceContext';
import { BrandLogo } from '@/components/ui/BrandLogo';
import type { AppResource } from '@/lib/domain/permissions';

const NAV_ITEMS: {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  resource: AppResource;
}[] = [
  { href: '/app', label: 'Visão geral', icon: LayoutDashboard, resource: 'dashboard' },
  { href: '/app/agenda', label: 'Agenda', icon: CalendarDays, resource: 'agenda' },
  { href: '/app/agendamentos', label: 'Agendamentos', icon: Calendar, resource: 'appointments' },
  { href: '/app/clientes', label: 'Clientes', icon: Users, resource: 'customers' },
  { href: '/app/profissionais', label: 'Especialistas', icon: UserCheck, resource: 'barbers' },
  { href: '/app/servicos', label: 'Serviços', icon: Scissors, resource: 'services' },
  { href: '/app/financeiro', label: 'Financeiro', icon: Wallet, resource: 'financial' },
  { href: '/app/comissoes', label: 'Comissões', icon: Coins, resource: 'commissions' },
  { href: '/app/estoque', label: 'Estoque', icon: Package, resource: 'inventory' },
  { href: '/app/marketing', label: 'Marketing', icon: Megaphone, resource: 'marketing' },
  { href: '/app/relatorios', label: 'Relatórios', icon: BarChart3, resource: 'reports' },
  { href: '/app/configuracoes', label: 'Configurações', icon: Settings, resource: 'settings' },
  { href: '/app/assinatura', label: 'Assinatura', icon: CreditCard, resource: 'subscription' },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { data, loading, error, selectedBranchId, setSelectedBranchId, can } = useWorkspace();
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);

  async function handleLogout() {
    await fetch('/api/auth', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'logout' }),
    });
    router.push('/login');
    router.refresh();
  }

  if (loading && !data) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0E0906] text-[#F7EFE6]">
        <div className="text-center space-y-3">
          <div className="mx-auto h-10 w-10 animate-spin rounded-full border-2 border-[#D49B6A] border-t-transparent" />
          <p className="text-xs uppercase tracking-widest text-[#B59E8D]">
            Carregando console Kortaz OS...
          </p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0E0906] p-6 text-[#F7EFE6]">
        <div className="hud-panel max-w-md rounded-2xl p-6 text-center">
          <ShieldAlert className="mx-auto h-8 w-8 text-[#E06258]" />
          <h2 className="mt-3 font-serif text-2xl">Sessão Necessária</h2>
          <p className="mt-2 text-xs text-[#B59E8D]">
            {error || 'Faça login para acessar a área administrativa.'}
          </p>
          <Link
            href="/login"
            className="mt-5 inline-block rounded-full bg-[#D49B6A] px-6 py-2.5 text-xs font-bold text-[#0E0906]"
          >
            Ir para Login
          </Link>
        </div>
      </div>
    );
  }

  const visibleNav = NAV_ITEMS.filter((item) => can(item.resource, 'can_view'));

  return (
    <div className="relative flex min-h-screen bg-[#0E0906] text-[#F7EFE6]">
      <div className="hud-radial-glow pointer-events-none fixed inset-0" />

      {/* Sidebar Desktop HUD Espresso */}
      <aside className="no-print relative z-20 hidden w-64 shrink-0 flex-col justify-between border-r border-[#D49B6A]/15 bg-[#18100C]/90 p-4 backdrop-blur-xl lg:flex">
        <div>
          <div className="border-b border-[#D49B6A]/15 px-2 pb-5 pt-1">
            <BrandLogo subtitle={data.tenant.name} title="KOR" accent="TAZ" href="/app" />
          </div>

          <nav className="mt-5 space-y-1">
            {visibleNav.map((item) => {
              const isActive =
                item.href === '/app' ? pathname === '/app' : pathname.startsWith(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-xs font-medium transition-all ${
                    isActive
                      ? 'bg-[#D49B6A] font-bold text-[#0E0906] shadow-lg shadow-[#D49B6A]/15'
                      : 'text-[#B59E8D] hover:bg-[#241710] hover:text-[#F7EFE6]'
                  }`}
                >
                  <item.icon className="h-4 w-4 shrink-0" />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="space-y-2 border-t border-[#D49B6A]/15 pt-4 text-xs">
          <Link
            href={`/s/${data.tenant.slug}`}
            target="_blank"
            className="flex items-center justify-between rounded-xl border border-[#D49B6A]/30 bg-[#0E0906] px-3 py-2 text-[#D49B6A] hover:bg-[#D49B6A]/10"
          >
            <span>Página Pública</span>
            <ExternalLink className="h-3.5 w-3.5" />
          </Link>

          {data.session.roleCode === 'SUPER_ADMIN' && (
            <Link
              href="/admin"
              className="flex items-center justify-between rounded-xl border border-white/15 bg-[#241710] px-3 py-2 text-[#F7EFE6]"
            >
              <span>Console Super Admin</span>
            </Link>
          )}

          <div className="flex items-center justify-between rounded-xl bg-[#0E0906]/90 px-3 py-2.5 border border-[#D49B6A]/15">
            <div className="min-w-0">
              <p className="truncate font-semibold text-[#F7EFE6]">
                {data.session.profile.full_name}
              </p>
              <p className="text-[10px] uppercase tracking-wider text-[#D49B6A]">
                {data.session.roleCode}
              </p>
            </div>
            <button
              type="button"
              onClick={handleLogout}
              title="Sair"
              className="rounded p-1.5 text-[#B59E8D] hover:bg-white/10 hover:text-[#E06258]"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* Drawer Mobile */}
      {mobileDrawerOpen && (
        <div className="fixed inset-0 z-50 flex lg:hidden">
          <div className="fixed inset-0 bg-black/75" onClick={() => setMobileDrawerOpen(false)} />
          <div className="relative z-10 flex w-72 flex-col justify-between bg-[#18100C] p-4">
            <div>
              <div className="flex items-center justify-between border-b border-[#D49B6A]/15 pb-4">
                <BrandLogo subtitle={data.tenant.name} title="KOR" accent="TAZ" href="/app" />
                <button
                  type="button"
                  onClick={() => setMobileDrawerOpen(false)}
                  className="rounded p-1 text-[#B59E8D]"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              <nav className="mt-4 max-h-[65vh] space-y-1 overflow-y-auto">
                {visibleNav.map((item) => {
                  const isActive =
                    item.href === '/app' ? pathname === '/app' : pathname.startsWith(item.href);
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setMobileDrawerOpen(false)}
                      className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-xs font-medium ${
                        isActive
                          ? 'bg-[#D49B6A] font-bold text-[#0E0906]'
                          : 'text-[#B59E8D] hover:bg-[#241710]'
                      }`}
                    >
                      <item.icon className="h-4 w-4" />
                      <span>{item.label}</span>
                    </Link>
                  );
                })}
              </nav>
            </div>
            <button
              type="button"
              onClick={handleLogout}
              className="flex items-center justify-center gap-2 rounded-full border border-[#E06258]/40 py-2.5 text-xs font-semibold text-[#E06258]"
            >
              <LogOut className="h-4 w-4" />
              <span>Sair da Conta</span>
            </button>
          </div>
        </div>
      )}

      {/* Área Principal */}
      <div className="relative z-10 flex min-w-0 flex-1 flex-col pb-20 lg:pb-0">
        <header className="no-print sticky top-0 z-30 flex items-center justify-between gap-3 border-b border-[#D49B6A]/15 bg-[#0E0906]/90 px-4 py-3 backdrop-blur-xl sm:px-6">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setMobileDrawerOpen(true)}
              className="rounded-xl border border-[#D49B6A]/20 bg-[#18100C] p-2 text-[#F7EFE6] lg:hidden"
              aria-label="Abrir menu"
            >
              <Menu className="h-4 w-4" />
            </button>
            <div>
              <p className="text-xs font-semibold text-[#F7EFE6]">{data.tenant.name}</p>
              <p className="text-[11px] text-[#B59E8D]">
                {data.plan.name} &bull; {data.session.roleCode}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 rounded-full border border-[#D49B6A]/25 bg-[#18100C] px-3 py-1.5">
              <Building2 className="h-3.5 w-3.5 text-[#D49B6A]" />
              <select
                aria-label="Selecionar unidade"
                value={selectedBranchId}
                onChange={(e) => setSelectedBranchId(e.target.value)}
                className="bg-transparent text-xs text-[#F7EFE6] focus:outline-none"
              >
                <option value="all" className="bg-[#18100C]">
                  Todas as unidades ({data.branches.length})
                </option>
                {data.branches.map((b) => (
                  <option key={b.id} value={b.id} className="bg-[#18100C]">
                    {b.name}
                  </option>
                ))}
              </select>
            </div>

            <Link
              href={`/s/${data.tenant.slug}`}
              target="_blank"
              className="hidden rounded-full border border-[#D49B6A]/40 px-4 py-1.5 text-xs font-semibold text-[#D49B6A] hover:bg-[#D49B6A]/10 sm:inline-block"
            >
              Ver Site Público
            </Link>
          </div>
        </header>

        <main className="flex-1 p-4 sm:p-6">{children}</main>
      </div>

      {/* Bottom Navigation Mobile-First */}
      <nav className="no-print fixed bottom-0 left-0 right-0 z-40 grid grid-cols-5 border-t border-[#D49B6A]/20 bg-[#18100C]/95 py-2 backdrop-blur-xl lg:hidden">
        {[
          { href: '/app', label: 'Hoje', icon: LayoutDashboard },
          { href: '/app/agenda', label: 'Agenda', icon: CalendarDays },
          { href: '/app/agendamentos', label: 'Atender', icon: Calendar },
          { href: '/app/comissoes', label: 'Comissão', icon: Coins },
          { href: '/app/clientes', label: 'Clientes', icon: Users },
        ].map((item) => {
          const active = item.href === '/app' ? pathname === '/app' : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center justify-center gap-1 text-[10px] font-medium ${
                active ? 'text-[#D49B6A]' : 'text-[#B59E8D]'
              }`}
            >
              <item.icon className="h-4 w-4" />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
