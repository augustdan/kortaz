'use client';

import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  Activity,
  Building,
  CreditCard,
  FileText,
  Layers,
  LayoutDashboard,
  LogOut,
  Menu,
  Settings,
  ShieldAlert,
  Tag,
  X,
} from 'lucide-react';
import { BrandLogo } from '@/components/ui/BrandLogo';
import type {
  AuditLog,
  Coupon,
  NotificationJob,
  PlatformSettings,
  Subscription,
  SubscriptionEvent,
  SubscriptionFeature,
  SubscriptionPlan,
  Tenant,
} from '@/lib/types/domain';

export interface SuperAdminPayload {
  metrics: {
    totalBarbershops: number;
    activeAccounts: number;
    freeAccounts: number;
    paidSubscribers: number;
    mrr: number;
    arr: number;
    churnRate: number;
    cancelledSubscriptions: number;
    platformRevenueMonth: number;
  };
  tenants: Tenant[];
  plans: SubscriptionPlan[];
  features: SubscriptionFeature[];
  subscriptions: Subscription[];
  subscriptionEvents: SubscriptionEvent[];
  saasCoupons: Coupon[];
  auditLogs: AuditLog[];
  notificationFailures: NotificationJob[];
  platformSettings: PlatformSettings;
}

const AdminContext = createContext<{
  data: SuperAdminPayload | null;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
} | null>(null);

export function useAdminData() {
  const ctx = useContext(AdminContext);
  if (!ctx) throw new Error('useAdminData must be used inside AdminShell');
  return ctx;
}

const ADMIN_NAV = [
  { href: '/admin', label: 'Visão SaaS', icon: LayoutDashboard },
  { href: '/admin/barbearias', label: 'Estabelecimentos', icon: Building },
  { href: '/admin/planos', label: 'Planos & Limites', icon: Layers },
  { href: '/admin/assinaturas', label: 'Assinaturas', icon: CreditCard },
  { href: '/admin/pagamentos', label: 'Receita & Cobranças', icon: Activity },
  { href: '/admin/cupons', label: 'Cupons SaaS', icon: Tag },
  { href: '/admin/configuracoes', label: 'Configurações Globais', icon: Settings },
  { href: '/admin/auditoria', label: 'Auditoria & Logs', icon: FileText },
];

export function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [data, setData] = useState<SuperAdminPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [mobileOpen, setMobileOpen] = useState(false);

  const refresh = useCallback(async () => {
    setLoading((p) => (data ? p : true));
    try {
      const res = await fetch('/api/admin', { cache: 'no-store' });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error || 'Acesso exclusivo para Super Admin.');
        return;
      }
      setData(json as SuperAdminPayload);
      setError(null);
    } catch {
      setError('Erro de rede ao carregar painel Super Admin.');
    } finally {
      setLoading(false);
    }
  }, [data]);

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
      <div className="flex min-h-screen items-center justify-center bg-[#090909] text-xs text-[#A5A09A]">
        Carregando Console Super Admin...
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#090909] p-6">
        <div className="max-w-md rounded-2xl border border-[#EF5350]/40 bg-[#151515] p-8 text-center">
          <ShieldAlert className="mx-auto h-10 w-10 text-[#EF5350]" />
          <h2 className="mt-3 font-display text-2xl font-bold text-[#F5F1EB]">Acesso Restrito</h2>
          <p className="mt-2 text-xs text-[#A5A09A]">{error}</p>
          <Link
            href="/login"
            className="mt-5 inline-block rounded-xl bg-[#D99A4E] px-5 py-2.5 text-xs font-bold text-[#090909]"
          >
            Entrar como Super Admin
          </Link>
        </div>
      </div>
    );
  }

  const renderNav = (onNav?: () => void) => (
    <nav className="mt-5 space-y-1">
      {ADMIN_NAV.map((item) => {
        const active =
          item.href === '/admin' ? pathname === '/admin' : pathname.startsWith(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNav}
            className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-xs font-medium transition-colors ${
              active
                ? 'border border-[#D99A4E]/35 bg-[#D99A4E]/15 font-semibold text-[#F2B968]'
                : 'border border-transparent text-[#A5A09A] hover:bg-[#151515] hover:text-[#F5F1EB]'
            }`}
          >
            <item.icon className={`h-4 w-4 ${active ? 'text-[#D99A4E]' : ''}`} />
            <span>{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );

  return (
    <AdminContext.Provider value={{ data, loading, error, refresh }}>
      <div className="flex min-h-screen bg-[#090909] text-[#F5F1EB]">
        <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col justify-between border-r border-[#292521] bg-[#0C0C0C] p-4 md:flex">
          <div>
            <div className="border-b border-[#292521] pb-4">
              <BrandLogo subtitle="SUPER ADMIN" href="/admin" />
            </div>
            {renderNav()}
          </div>

          <div className="space-y-2 border-t border-[#292521] pt-4 text-xs">
            <Link
              href="/app"
              className="block rounded-xl border border-[#292521] bg-[#151515] px-3 py-2 text-center font-medium text-[#F5F1EB] hover:border-[#D99A4E]/50"
            >
              Painel do Estabelecimento
            </Link>
            <button
              type="button"
              onClick={handleLogout}
              className="flex w-full items-center justify-center gap-2 rounded-xl border border-[#EF5350]/35 bg-[#EF5350]/10 py-2 font-semibold text-[#EF5350] hover:bg-[#EF5350]/20"
            >
              <LogOut className="h-3.5 w-3.5" /> Sair
            </button>
          </div>
        </aside>

        <div className="flex min-w-0 flex-1 flex-col">
          <header className="sticky top-0 z-20 flex items-center justify-between border-b border-[#292521] bg-[#090909]/90 px-4 py-3 backdrop-blur-xl md:hidden">
            <BrandLogo subtitle="SUPER ADMIN" href="/admin" />
            <button
              type="button"
              onClick={() => setMobileOpen(true)}
              aria-label="Abrir menu admin"
              className="flex h-10 w-10 items-center justify-center rounded-xl border border-[#292521] bg-[#151515] text-[#F5F1EB]"
            >
              <Menu className="h-5 w-5" />
            </button>
          </header>

          {mobileOpen && (
            <div className="fixed inset-0 z-50 flex md:hidden">
              <div
                className="fixed inset-0 bg-black/75 backdrop-blur-sm"
                onClick={() => setMobileOpen(false)}
              />
              <aside className="relative z-10 flex w-72 flex-col justify-between border-r border-[#292521] bg-[#0C0C0C] p-4">
                <div>
                  <div className="flex items-center justify-between border-b border-[#292521] pb-4">
                    <BrandLogo subtitle="SUPER ADMIN" href="/admin" />
                    <button
                      type="button"
                      onClick={() => setMobileOpen(false)}
                      className="rounded-lg p-1.5 text-[#A5A09A]"
                    >
                      <X className="h-5 w-5" />
                    </button>
                  </div>
                  {renderNav(() => setMobileOpen(false))}
                </div>
                <button
                  type="button"
                  onClick={handleLogout}
                  className="flex w-full items-center justify-center gap-2 rounded-xl border border-[#EF5350]/35 bg-[#EF5350]/10 py-2.5 text-xs font-semibold text-[#EF5350]"
                >
                  <LogOut className="h-4 w-4" /> Sair
                </button>
              </aside>
            </div>
          )}

          <main className="p-4 sm:p-6 lg:p-8">{children}</main>
        </div>
      </div>
    </AdminContext.Provider>
  );
}
