'use client';

import React, { useMemo, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  BarChart3,
  Bell,
  Building2,
  Calendar,
  CalendarDays,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Coins,
  CreditCard,
  ExternalLink,
  LayoutDashboard,
  LogOut,
  Megaphone,
  Menu,
  Package,
  Scissors,
  Search,
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
import { formatTimeBR } from '@/lib/utils';

interface NavItem {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  resource: AppResource;
}

const NAV_GROUPS: { title: string; items: NavItem[] }[] = [
  {
    title: 'MENU PRINCIPAL',
    items: [
      { href: '/app', label: 'Início', icon: LayoutDashboard, resource: 'dashboard' },
      { href: '/app/agenda', label: 'Agenda', icon: CalendarDays, resource: 'agenda' },
      { href: '/app/agendamentos', label: 'Agendamentos', icon: Calendar, resource: 'appointments' },
      { href: '/app/servicos', label: 'Serviços', icon: Scissors, resource: 'services' },
      { href: '/app/profissionais', label: 'Profissionais', icon: UserCheck, resource: 'barbers' },
      { href: '/app/clientes', label: 'Clientes', icon: Users, resource: 'customers' },
    ],
  },
  {
    title: 'GESTÃO',
    items: [
      { href: '/app/financeiro', label: 'Financeiro', icon: Wallet, resource: 'financial' },
      { href: '/app/comissoes', label: 'Comissões', icon: Coins, resource: 'commissions' },
      { href: '/app/estoque', label: 'Estoque', icon: Package, resource: 'inventory' },
      { href: '/app/marketing', label: 'Marketing', icon: Megaphone, resource: 'marketing' },
      { href: '/app/relatorios', label: 'Relatórios', icon: BarChart3, resource: 'reports' },
    ],
  },
  {
    title: 'CONTA',
    items: [
      { href: '/app/assinatura', label: 'Assinatura', icon: CreditCard, resource: 'subscription' },
      { href: '/app/configuracoes', label: 'Configurações', icon: Settings, resource: 'settings' },
    ],
  },
];

const ROLE_LABELS: Record<string, string> = {
  SUPER_ADMIN: 'Super Admin',
  TENANT_OWNER: 'Proprietário',
  BRANCH_MANAGER: 'Gerente',
  BARBER: 'Profissional',
  RECEPTIONIST: 'Recepção',
};

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { data, loading, error, selectedBranchId, setSelectedBranchId, can } = useWorkspace();
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [notifOpen, setNotifOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);

  const searchResults = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!data || q.length < 2) return [];

    const results: { id: string; label: string; sublabel: string; href: string; type: string }[] = [];

    for (const c of data.customers) {
      if (c.full_name.toLowerCase().includes(q) || (c.phone && c.phone.includes(q))) {
        results.push({
          id: `c-${c.id}`,
          label: c.full_name,
          sublabel: c.phone || c.email || 'Cliente',
          href: '/app/clientes',
          type: 'Cliente',
        });
      }
      if (results.length >= 4) break;
    }

    for (const s of data.services) {
      if (s.name.toLowerCase().includes(q)) {
        results.push({
          id: `s-${s.id}`,
          label: s.name,
          sublabel: `${s.duration_minutes} min`,
          href: '/app/servicos',
          type: 'Serviço',
        });
      }
      if (results.length >= 6) break;
    }

    for (const b of data.barbers) {
      if (b.name.toLowerCase().includes(q)) {
        results.push({
          id: `b-${b.id}`,
          label: b.name,
          sublabel: b.specialty || 'Profissional',
          href: '/app/profissionais',
          type: 'Profissional',
        });
      }
      if (results.length >= 8) break;
    }

    for (const a of data.appointments) {
      const cust = data.customers.find((c) => c.id === a.customer_id);
      if (cust?.full_name.toLowerCase().includes(q)) {
        results.push({
          id: `a-${a.id}`,
          label: `Agendamento · ${cust.full_name}`,
          sublabel: `${formatTimeBR(a.starts_at)} · ${a.status}`,
          href: '/app/agendamentos',
          type: 'Agenda',
        });
      }
      if (results.length >= 10) break;
    }

    return results;
  }, [data, searchQuery]);

  const notifications = useMemo(() => {
    if (!data) return [];
    const list: { id: string; title: string; detail: string; href: string }[] = [];

    const pendingCount = data.appointments.filter((a) => a.status === 'pending').length;
    if (pendingCount > 0) {
      list.push({
        id: 'pending-appts',
        title: `${pendingCount} agendamento(s) pendente(s)`,
        detail: 'Aguardando confirmação da equipe.',
        href: '/app/agendamentos',
      });
    }

    const lowStock = data.products.filter((p) => p.is_active && p.stock_quantity <= p.min_stock_level);
    if (lowStock.length > 0) {
      list.push({
        id: 'low-stock',
        title: `${lowStock.length} produto(s) em estoque baixo`,
        detail: lowStock.slice(0, 2).map((p) => p.name).join(', '),
        href: '/app/estoque',
      });
    }

    const failedNotifs = data.notificationJobs.filter((n) => n.status === 'failed').length;
    if (failedNotifs > 0) {
      list.push({
        id: 'failed-notifs',
        title: `${failedNotifs} notificação(ões) com falha`,
        detail: 'Verifique a fila em Marketing.',
        href: '/app/marketing',
      });
    }

    return list;
  }, [data]);

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
      <div className="flex min-h-screen items-center justify-center bg-[#090909] text-[#F5F1EB]">
        <div className="space-y-3 text-center">
          <div className="mx-auto h-10 w-10 animate-spin rounded-full border-2 border-[#D99A4E] border-t-transparent" />
          <p className="text-xs font-medium uppercase tracking-widest text-[#A5A09A]">
            Carregando Kortaz...
          </p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#090909] p-6 text-[#F5F1EB]">
        <div className="max-w-md rounded-2xl border border-[#292521] bg-[#151515] p-6 text-center">
          <ShieldAlert className="mx-auto h-8 w-8 text-[#EF5350]" />
          <h2 className="mt-3 font-display text-xl font-bold">Sessão Necessária</h2>
          <p className="mt-2 text-xs text-[#A5A09A]">
            {error || 'Faça login para acessar a área administrativa.'}
          </p>
          <Link
            href="/login"
            className="mt-5 inline-block rounded-xl bg-[#D99A4E] px-6 py-2.5 text-xs font-bold text-[#090909]"
          >
            Ir para Login
          </Link>
        </div>
      </div>
    );
  }

  const pendingBadgeCount = data.appointments.filter((a) => a.status === 'pending').length;
  const userInitials = data.session.profile.full_name
    .split(' ')
    .slice(0, 2)
    .map((p) => p[0])
    .join('')
    .toUpperCase();

  const renderNavGroups = (isCompact: boolean, onNavigate?: () => void) => (
    <div className="space-y-5">
      {NAV_GROUPS.map((group) => {
        const visibleItems = group.items.filter((item) => can(item.resource, 'can_view'));
        if (visibleItems.length === 0) return null;
        return (
          <div key={group.title}>
            {!isCompact && (
              <p className="mb-2 px-3 text-[10px] font-bold uppercase tracking-[0.18em] text-[#A5A09A]/70">
                {group.title}
              </p>
            )}
            <nav className="space-y-1">
              {visibleItems.map((item) => {
                const isActive =
                  item.href === '/app' ? pathname === '/app' : pathname.startsWith(item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    title={isCompact ? item.label : undefined}
                    onClick={onNavigate}
                    className={`flex items-center justify-between rounded-xl px-3 py-2.5 text-xs font-medium transition-all ${
                      isActive
                        ? 'bg-[#D99A4E]/15 text-[#F2B968] border border-[#D99A4E]/35 font-semibold'
                        : 'text-[#A5A09A] border border-transparent hover:bg-[#151515] hover:text-[#F5F1EB]'
                    } ${isCompact ? 'justify-center px-2' : ''}`}
                  >
                    <span className="flex items-center gap-3">
                      <item.icon className={`h-4 w-4 shrink-0 ${isActive ? 'text-[#D99A4E]' : ''}`} />
                      {!isCompact && <span>{item.label}</span>}
                    </span>
                    {!isCompact && item.href === '/app/agendamentos' && pendingBadgeCount > 0 && (
                      <span className="rounded-full bg-[#D99A4E] px-1.5 py-0.5 text-[10px] font-bold text-[#090909]">
                        {pendingBadgeCount}
                      </span>
                    )}
                  </Link>
                );
              })}
            </nav>
          </div>
        );
      })}
    </div>
  );

  return (
    <div className="flex min-h-screen bg-[#090909] text-[#F5F1EB]">
      {/* Sidebar Desktop Fixa (#0C0C0C) */}
      <aside
        className={`no-print sticky top-0 z-30 hidden h-screen shrink-0 flex-col justify-between border-r border-[#292521] bg-[#0C0C0C] transition-all duration-200 lg:flex ${
          collapsed ? 'w-[76px] p-3' : 'w-64 p-4'
        }`}
      >
        <div className="flex min-h-0 flex-1 flex-col">
          <div className="flex items-center justify-between border-b border-[#292521] pb-4">
            <BrandLogo
              subtitle={data.tenant.name}
              href="/app"
              compact={collapsed}
            />
            <button
              type="button"
              onClick={() => setCollapsed((p) => !p)}
              title={collapsed ? 'Expandir menu' : 'Recolher menu'}
              className="hidden h-7 w-7 items-center justify-center rounded-lg border border-[#292521] bg-[#151515] text-[#A5A09A] hover:text-[#F5F1EB] lg:flex"
            >
              {collapsed ? <ChevronRight className="h-3.5 w-3.5" /> : <ChevronLeft className="h-3.5 w-3.5" />}
            </button>
          </div>

          <div className="mt-4 flex-1 overflow-y-auto pr-1">
            {renderNavGroups(collapsed)}
          </div>
        </div>

        <div className="space-y-2.5 border-t border-[#292521] pt-3 text-xs">
          {!collapsed && (
            <div className="rounded-xl border border-[#292521] bg-[#151515] p-3">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-[#F2B968]">{data.plan.name}</span>
                <span className="rounded-full bg-[#16C784]/15 px-2 py-0.5 text-[10px] font-semibold uppercase text-[#16C784]">
                  {data.subscription.status}
                </span>
              </div>
              <Link
                href="/app/assinatura"
                className="mt-2 block w-full rounded-lg border border-[#292521] bg-[#090909] py-1.5 text-center text-[11px] font-semibold text-[#F5F1EB] hover:border-[#D99A4E]/50"
              >
                Gerenciar plano
              </Link>
            </div>
          )}

          <div className="flex items-center justify-between gap-2 px-1">
            {!collapsed && (
              <Link
                href={`/s/${data.tenant.slug}`}
                target="_blank"
                className="inline-flex items-center gap-1.5 text-[11px] font-medium text-[#D99A4E] hover:text-[#F2B968]"
              >
                <span>Vitrine pública</span>
                <ExternalLink className="h-3 w-3" />
              </Link>
            )}
            <span className="text-[10px] text-[#A5A09A]/70">v2.0.0</span>
          </div>
        </div>
      </aside>

      {/* Coluna Principal */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Topbar */}
        <header className="no-print sticky top-0 z-20 flex h-16 items-center justify-between gap-3 border-b border-[#292521] bg-[#090909]/90 px-4 backdrop-blur-xl sm:px-6">
          <div className="flex flex-1 items-center gap-3">
            <button
              type="button"
              onClick={() => setMobileDrawerOpen(true)}
              aria-label="Abrir navegação"
              className="flex h-10 w-10 items-center justify-center rounded-xl border border-[#292521] bg-[#151515] text-[#F5F1EB] lg:hidden"
            >
              <Menu className="h-5 w-5" />
            </button>

            {/* Busca Global Real */}
            <div className="relative w-full max-w-md">
              <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#A5A09A]" />
              <input
                type="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar cliente, serviço, profissional..."
                className="h-10 w-full rounded-xl border border-[#292521] bg-[#151515] pl-10 pr-4 text-xs text-[#F5F1EB] placeholder:text-[#A5A09A] focus:border-[#D99A4E] focus:outline-none"
              />
              {searchResults.length > 0 && (
                <div className="absolute left-0 right-0 top-12 z-40 overflow-hidden rounded-xl border border-[#292521] bg-[#151515] shadow-2xl">
                  {searchResults.map((res) => (
                    <Link
                      key={res.id}
                      href={res.href}
                      onClick={() => setSearchQuery('')}
                      className="flex items-center justify-between border-b border-[#292521]/60 px-4 py-2.5 text-xs last:border-b-0 hover:bg-[#1B1B1B]"
                    >
                      <div>
                        <p className="font-semibold text-[#F5F1EB]">{res.label}</p>
                        <p className="text-[11px] text-[#A5A09A]">{res.sublabel}</p>
                      </div>
                      <span className="rounded-md bg-[#1B1B1B] px-2 py-0.5 text-[10px] font-medium text-[#D99A4E]">
                        {res.type}
                      </span>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            {data.branches.length > 1 && (
              <div className="hidden items-center gap-1.5 rounded-xl border border-[#292521] bg-[#151515] px-2.5 py-1.5 text-xs sm:flex">
                <Building2 className="h-3.5 w-3.5 text-[#D99A4E]" />
                <select
                  aria-label="Selecionar unidade"
                  value={selectedBranchId}
                  onChange={(e) => setSelectedBranchId(e.target.value)}
                  className="bg-transparent text-xs text-[#F5F1EB] focus:outline-none"
                >
                  <option value="all" className="bg-[#151515]">
                    Todas as unidades
                  </option>
                  {data.branches.map((branch) => (
                    <option key={branch.id} value={branch.id} className="bg-[#151515]">
                      {branch.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Notificações Reais */}
            <div className="relative">
              <button
                type="button"
                onClick={() => {
                  setNotifOpen((p) => !p);
                  setProfileOpen(false);
                }}
                aria-label="Notificações"
                className="relative flex h-10 w-10 items-center justify-center rounded-xl border border-[#292521] bg-[#151515] text-[#A5A09A] transition-colors hover:border-[#D99A4E]/50 hover:text-[#F5F1EB]"
              >
                <Bell className="h-4 w-4" />
                {notifications.length > 0 && (
                  <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-[#EF5350] px-1 text-[10px] font-bold text-white">
                    {notifications.length}
                  </span>
                )}
              </button>

              {notifOpen && (
                <div className="absolute right-0 top-12 z-40 w-80 rounded-2xl border border-[#292521] bg-[#151515] p-3 shadow-2xl">
                  <p className="px-2 py-1 text-xs font-bold text-[#F5F1EB]">Alertas do sistema</p>
                  <div className="mt-2 space-y-1.5">
                    {notifications.length === 0 ? (
                      <p className="px-2 py-4 text-center text-xs text-[#A5A09A]">
                        Nenhum alerta pendente no momento.
                      </p>
                    ) : (
                      notifications.map((n) => (
                        <Link
                          key={n.id}
                          href={n.href}
                          onClick={() => setNotifOpen(false)}
                          className="block rounded-xl border border-[#292521] bg-[#1B1B1B] p-2.5 hover:border-[#D99A4E]/50"
                        >
                          <p className="text-xs font-semibold text-[#F5F1EB]">{n.title}</p>
                          <p className="mt-0.5 text-[11px] text-[#A5A09A]">{n.detail}</p>
                        </Link>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Menu de Perfil */}
            <div className="relative">
              <button
                type="button"
                onClick={() => {
                  setProfileOpen((p) => !p);
                  setNotifOpen(false);
                }}
                className="flex items-center gap-2.5 rounded-xl border border-[#292521] bg-[#151515] px-2.5 py-1.5 text-left transition-colors hover:border-[#D99A4E]/50"
              >
                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#D99A4E]/20 text-xs font-bold text-[#F2B968]">
                  {userInitials || 'KZ'}
                </div>
                <div className="hidden sm:block">
                  <p className="max-w-[120px] truncate text-xs font-semibold text-[#F5F1EB]">
                    {data.session.profile.full_name}
                  </p>
                  <p className="text-[10px] text-[#A5A09A]">
                    {ROLE_LABELS[data.session.roleCode] || data.session.roleCode}
                  </p>
                </div>
                <ChevronDown className="h-3.5 w-3.5 text-[#A5A09A]" />
              </button>

              {profileOpen && (
                <div className="absolute right-0 top-12 z-40 w-56 rounded-2xl border border-[#292521] bg-[#151515] p-2 shadow-2xl">
                  {data.session.roleCode === 'SUPER_ADMIN' && (
                    <Link
                      href="/admin"
                      onClick={() => setProfileOpen(false)}
                      className="block rounded-xl px-3 py-2 text-xs font-medium text-[#F2B968] hover:bg-[#1B1B1B]"
                    >
                      Console Super Admin
                    </Link>
                  )}
                  <Link
                    href="/app/configuracoes"
                    onClick={() => setProfileOpen(false)}
                    className="block rounded-xl px-3 py-2 text-xs font-medium text-[#F5F1EB] hover:bg-[#1B1B1B]"
                  >
                    Configurações
                  </Link>
                  <button
                    type="button"
                    onClick={handleLogout}
                    className="mt-1 flex w-full items-center gap-2 rounded-xl px-3 py-2 text-xs font-medium text-[#EF5350] hover:bg-[#EF5350]/10"
                  >
                    <LogOut className="h-3.5 w-3.5" />
                    Sair da conta
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Mobile Drawer */}
        {mobileDrawerOpen && (
          <div className="fixed inset-0 z-50 flex lg:hidden">
            <div
              className="fixed inset-0 bg-black/75 backdrop-blur-sm"
              onClick={() => setMobileDrawerOpen(false)}
            />
            <aside className="relative z-10 flex w-72 flex-col justify-between border-r border-[#292521] bg-[#0C0C0C] p-4">
              <div className="flex min-h-0 flex-1 flex-col">
                <div className="flex items-center justify-between border-b border-[#292521] pb-4">
                  <BrandLogo subtitle={data.tenant.name} href="/app" />
                  <button
                    type="button"
                    onClick={() => setMobileDrawerOpen(false)}
                    className="rounded-lg p-1.5 text-[#A5A09A] hover:text-[#F5F1EB]"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>
                <div className="mt-4 flex-1 overflow-y-auto">
                  {renderNavGroups(false, () => setMobileDrawerOpen(false))}
                </div>
              </div>

              <div className="border-t border-[#292521] pt-3">
                <button
                  type="button"
                  onClick={handleLogout}
                  className="flex w-full items-center justify-center gap-2 rounded-xl border border-[#EF5350]/30 bg-[#EF5350]/10 py-2.5 text-xs font-semibold text-[#EF5350]"
                >
                  <LogOut className="h-4 w-4" />
                  Sair
                </button>
              </div>
            </aside>
          </div>
        )}

        <main className="flex-1 p-4 sm:p-6 lg:p-8">{children}</main>
      </div>
    </div>
  );
}
