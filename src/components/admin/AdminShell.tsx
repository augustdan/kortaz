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
  Settings,
  ShieldAlert,
  Tag,
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
  { href: '/admin/barbearias', label: 'Barbearias', icon: Building },
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
      <div className="flex min-h-screen items-center justify-center bg-[#0E0906] text-xs text-[#B59E8D]">
        Carregando Console Super Admin...
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0E0906] p-6">
        <div className="max-w-md rounded-2xl border border-[#E06258]/40 bg-[#18100C] p-8 text-center">
          <ShieldAlert className="mx-auto h-10 w-10 text-[#E06258]" />
          <h2 className="mt-3 font-serif text-2xl text-[#F7EFE6]">Acesso Restrito</h2>
          <p className="mt-2 text-xs text-[#B59E8D]">{error}</p>
          <Link
            href="/login"
            className="mt-5 inline-block rounded-lg bg-[#D49B6A] px-5 py-2.5 text-xs font-bold text-[#0E0906]"
          >
            Entrar como Super Admin
          </Link>
        </div>
      </div>
    );
  }

  return (
    <AdminContext.Provider value={{ data, loading, error, refresh }}>
      <div className="flex min-h-screen bg-[#0E0906] text-[#F7EFE6]">
        <aside className="hidden w-64 shrink-0 flex-col justify-between border-r border-white/10 bg-[#18100C] p-4 md:flex">
          <div>
            <div className="border-b border-white/10 pb-4">
              <BrandLogo subtitle="SUPER ADMIN" href="/admin" />
            </div>
            <nav className="mt-4 space-y-1">
              {ADMIN_NAV.map((item) => {
                const active =
                  item.href === '/admin' ? pathname === '/admin' : pathname.startsWith(item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-xs font-medium ${
                      active
                        ? 'bg-[#D49B6A] font-bold text-[#0E0906]'
                        : 'text-[#B59E8D] hover:bg-[#241710] hover:text-[#F7EFE6]'
                    }`}
                  >
                    <item.icon className="h-4 w-4" />
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </nav>
          </div>

          <div className="space-y-2 border-t border-white/10 pt-4 text-xs">
            <Link
              href="/app"
              className="block rounded-lg border border-white/15 px-3 py-2 text-center hover:border-[#D49B6A]"
            >
              Ver Painel Barbearia
            </Link>
            <button
              type="button"
              onClick={handleLogout}
              className="flex w-full items-center justify-center gap-2 rounded-lg border border-[#E06258]/40 py-2 text-[#E06258]"
            >
              <LogOut className="h-3.5 w-3.5" /> Sair
            </button>
          </div>
        </aside>

        <div className="flex-1 min-w-0">
          <header className="flex items-center justify-between border-b border-white/10 bg-[#0E0906] px-6 py-3.5 md:hidden">
            <BrandLogo subtitle="SUPER ADMIN" href="/admin" />
            <div className="flex gap-2 overflow-x-auto text-xs">
              {ADMIN_NAV.slice(0, 4).map((n) => (
                <Link key={n.href} href={n.href} className="text-[#D49B6A]">
                  {n.label}
                </Link>
              ))}
            </div>
          </header>
          <main className="p-5 sm:p-8">{children}</main>
        </div>
      </div>
    </AdminContext.Provider>
  );
}
