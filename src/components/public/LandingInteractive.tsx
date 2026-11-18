'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { ArrowRight, Check, Menu, Sparkles, X } from 'lucide-react';
import { BrandLogo } from '@/components/ui/BrandLogo';
import type { SubscriptionPlan } from '@/lib/types/domain';
import { formatCurrencyBRL } from '@/lib/utils';

export function LandingHeader() {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 border-b border-[#292521]/80 bg-[#090909]/85 backdrop-blur-xl">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3.5 sm:px-6 lg:px-8">
        <BrandLogo />

        <nav className="hidden items-center gap-8 text-sm font-medium text-[#A5A09A] md:flex">
          <a href="#inicio" className="transition-colors hover:text-[#F5F1EB]">
            Início
          </a>
          <a href="#recursos" className="transition-colors hover:text-[#F5F1EB]">
            Recursos
          </a>
          <a href="#planos" className="transition-colors hover:text-[#F5F1EB]">
            Preços
          </a>
          <a href="#sobre" className="transition-colors hover:text-[#F5F1EB]">
            Sobre
          </a>
        </nav>

        <div className="hidden items-center gap-3 md:flex">
          <Link
            href="/login"
            className="rounded-xl border border-[#292521] bg-[#151515] px-4 py-2 text-xs font-semibold text-[#F5F1EB] transition-colors hover:border-[#D99A4E]/60"
          >
            Entrar
          </Link>
          <Link
            href="/cadastro"
            className="inline-flex items-center gap-1.5 rounded-xl bg-[#D99A4E] px-4 py-2 text-xs font-bold text-[#090909] transition-colors hover:bg-[#F2B968]"
          >
            Criar conta grátis
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>

        <button
          type="button"
          onClick={() => setMobileOpen((p) => !p)}
          aria-label="Abrir menu"
          className="flex h-10 w-10 items-center justify-center rounded-xl border border-[#292521] bg-[#151515] text-[#F5F1EB] md:hidden"
        >
          {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {mobileOpen && (
        <div className="border-t border-[#292521] bg-[#0C0C0C] px-4 py-4 md:hidden">
          <nav className="flex flex-col gap-3 text-sm font-medium text-[#A5A09A]">
            <a href="#inicio" onClick={() => setMobileOpen(false)} className="py-1.5 hover:text-[#F5F1EB]">
              Início
            </a>
            <a href="#recursos" onClick={() => setMobileOpen(false)} className="py-1.5 hover:text-[#F5F1EB]">
              Recursos
            </a>
            <a href="#planos" onClick={() => setMobileOpen(false)} className="py-1.5 hover:text-[#F5F1EB]">
              Preços
            </a>
            <a href="#sobre" onClick={() => setMobileOpen(false)} className="py-1.5 hover:text-[#F5F1EB]">
              Sobre
            </a>
          </nav>
          <div className="mt-4 flex flex-col gap-2.5 border-t border-[#292521] pt-4">
            <Link
              href="/login"
              onClick={() => setMobileOpen(false)}
              className="rounded-xl border border-[#292521] bg-[#151515] py-2.5 text-center text-xs font-semibold text-[#F5F1EB]"
            >
              Entrar
            </Link>
            <Link
              href="/cadastro"
              onClick={() => setMobileOpen(false)}
              className="rounded-xl bg-[#D99A4E] py-2.5 text-center text-xs font-bold text-[#090909]"
            >
              Criar conta grátis
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}

export function PlansSectionClient({
  plans,
  featuresByPlan = {},
}: {
  plans: SubscriptionPlan[];
  featuresByPlan?: Record<string, string[]>;
}) {
  return (
    <div className="mt-10 grid gap-6 lg:grid-cols-3">
      {plans.map((plan) => {
        const isPro = plan.code.toLowerCase() === 'pro' || plan.is_popular;
        const displayPrice = plan.price_monthly;

        const limitsSummary: string[] = [
          plan.max_branches >= 999
            ? 'Unidades ilimitadas'
            : `Até ${plan.max_branches} ${plan.max_branches === 1 ? 'unidade' : 'unidades'}`,
          plan.max_barbers === null || plan.max_barbers >= 999
            ? 'Profissionais ilimitados'
            : `Até ${plan.max_barbers} profissionais`,
          plan.max_monthly_appointments === null || plan.max_monthly_appointments >= 99999
            ? 'Agendamentos ilimitados'
            : `Até ${plan.max_monthly_appointments} agendamentos/mês`,
        ];

        const extraFeatures = (featuresByPlan[plan.id] || []).slice(0, 4);
        const allBullets = [...limitsSummary, ...extraFeatures];

        return (
          <div
            key={plan.id}
            className={`relative flex flex-col justify-between rounded-2xl border p-6 transition-all ${
              isPro
                ? 'border-[#D99A4E] bg-[#1B1B1B] shadow-[0_24px_56px_-24px_rgba(217,154,78,0.35)]'
                : 'border-[#292521] bg-[#151515] hover:border-[#D99A4E]/40'
            }`}
          >
            {isPro && (
              <div className="absolute -top-3 left-6 inline-flex items-center gap-1 rounded-full bg-[#D99A4E] px-3 py-0.5 text-[11px] font-bold uppercase tracking-wider text-[#090909]">
                <Sparkles className="h-3 w-3" />
                Recomendado
              </div>
            )}

            <div>
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#D99A4E]">
                {plan.code.toUpperCase()}
              </p>
              <h3 className="mt-1 font-display text-2xl font-bold text-[#F5F1EB]">
                {plan.name}
              </h3>
              <p className="mt-1.5 text-xs leading-relaxed text-[#A5A09A]">
                {plan.tagline}
              </p>

              <div className="mt-6 flex items-baseline gap-1.5 border-b border-[#292521] pb-6">
                <span className="font-display text-4xl font-extrabold text-[#F5F1EB]">
                  {plan.is_custom_pricing
                    ? 'Sob consulta'
                    : displayPrice === 0
                      ? 'Grátis'
                      : formatCurrencyBRL(displayPrice)}
                </span>
                {!plan.is_custom_pricing && displayPrice > 0 && (
                  <span className="text-xs text-[#A5A09A]">/mês</span>
                )}
              </div>

              <ul className="mt-6 space-y-3 text-xs text-[#F5F1EB]/90">
                {allBullets.map((item) => (
                  <li key={item} className="flex items-start gap-2.5">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-[#16C784]" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="mt-8">
              <Link
                href={`/cadastro?plan=${plan.code}`}
                className={`flex w-full items-center justify-center gap-2 rounded-xl py-3 text-xs font-bold transition-colors ${
                  isPro
                    ? 'bg-[#D99A4E] text-[#090909] hover:bg-[#F2B968]'
                    : 'border border-[#292521] bg-[#090909] text-[#F5F1EB] hover:border-[#D99A4E]/60'
                }`}
              >
                {displayPrice === 0 && !plan.is_custom_pricing ? 'Começar grátis' : 'Contratar plano'}
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          </div>
        );
      })}
    </div>
  );
}
