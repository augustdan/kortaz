import Image from 'next/image';
import Link from 'next/link';
import {
  ArrowRight,
  BarChart3,
  Building2,
  Calendar,
  CalendarCheck2,
  CheckCircle2,
  Coins,
  Crown,
  Gem,
  Globe,
  Megaphone,
  Package,
  Scissors,
  ShieldCheck,
  Sparkles,
  Star,
  UserCheck,
  Users,
  Wallet,
} from 'lucide-react';
import { BrandLogo } from '@/components/ui/BrandLogo';
import { LandingHeader, PlansSectionClient } from '@/components/public/LandingInteractive';
import { readDb } from '@/lib/server/store';
import { formatCurrencyBRL } from '@/lib/utils';

export const dynamic = 'force-dynamic';

const SEGMENTS = [
  { label: 'Barbearias', icon: Scissors },
  { label: 'Salões de Beleza', icon: Sparkles },
  { label: 'Beleza e Estilo', icon: Star },
  { label: 'Estética Avançada', icon: Crown },
  { label: 'Cuidados Masculinos', icon: Gem },
];

const PRODUCT_BENEFITS = [
  'Agendamento online e presencial.',
  'Controle financeiro e comissões.',
  'CRM de clientes e fidelidade.',
  'Marketing e promoções.',
  'Relatórios completos.',
];

const FEATURES = [
  {
    icon: Calendar,
    title: 'Agenda inteligente',
    description:
      'Grade diária, semanal e mensal sem conflitos de horário, com bloqueios e encaixes rápidos.',
  },
  {
    icon: UserCheck,
    title: 'Gestão de profissionais',
    description:
      'Controle escalas, especialidades, serviços atendidos e produtividade por especialista.',
  },
  {
    icon: Users,
    title: 'Cadastro de clientes',
    description:
      'CRM completo com histórico de visitas, preferências, total gasto e programa de fidelidade.',
  },
  {
    icon: Wallet,
    title: 'Financeiro',
    description:
      'Fluxo de caixa, entradas, saídas, fechamento diário e recebimentos integrados.',
  },
  {
    icon: Coins,
    title: 'Comissões automáticas',
    description:
      'Regras flexíveis por profissional ou serviço com fechamento transparente e zero planilha.',
  },
  {
    icon: Package,
    title: 'Controle de estoque',
    description:
      'Alertas de estoque mínimo, entradas, saídas e histórico de produtos profissionais e revenda.',
  },
  {
    icon: Megaphone,
    title: 'Marketing',
    description:
      'Campanhas, cupons promocionais e notificações automáticas integradas ao WhatsApp.',
  },
  {
    icon: BarChart3,
    title: 'Relatórios',
    description:
      'Indicadores reais de faturamento, ticket médio, retenção e serviços mais vendidos.',
  },
  {
    icon: Globe,
    title: 'Agendamento online',
    description:
      'Vitrine exclusiva do seu estabelecimento para clientes agendarem 24h pelo celular.',
  },
  {
    icon: Building2,
    title: 'Gestão de unidades',
    description:
      'Administre uma ou múltiplas unidades com isolamento de equipe e visão consolidada.',
  },
];

export default async function HomeLandingPage() {
  const db = await readDb();
  const plans = [...db.subscription_plans]
    .filter((p) => p.is_active)
    .sort((a, b) => a.sort_order - b.sort_order);

  const realReviews = db.reviews
    .filter((r) => r.is_published && r.comment.trim().length > 0)
    .slice(0, 3)
    .map((r) => {
      const customer = db.customers.find((c) => c.id === r.customer_id);
      const tenant = db.tenants.find((t) => t.id === r.tenant_id);
      return {
        id: r.id,
        rating: r.overall_rating,
        comment: r.comment,
        author: customer?.full_name || 'Cliente verificado',
        establishment: tenant?.name || 'Estabelecimento Kortaz',
      };
    });

  const featuresByPlanId = new Map<string, string[]>();
  for (const feat of db.subscription_features) {
    if (!feat.is_enabled) continue;
    const list = featuresByPlanId.get(feat.plan_id) || [];
    list.push(feat.label);
    featuresByPlanId.set(feat.plan_id, list);
  }

  return (
    <div id="inicio" className="min-h-screen overflow-x-hidden bg-[#090909] text-[#F5F1EB]">
      <LandingHeader />

      {/* 5.2 HERO */}
      <section className="relative overflow-hidden border-b border-[#292521]">
        <div className="hud-radial-glow pointer-events-none absolute inset-0" />
        <div className="relative mx-auto grid max-w-7xl items-center gap-10 px-4 py-14 sm:px-6 sm:py-20 lg:grid-cols-12 lg:gap-12 lg:px-8 lg:py-24">
          <div className="z-10 lg:col-span-6">
            <span className="inline-flex items-center gap-2 rounded-full border border-[#292521] bg-[#151515] px-3.5 py-1.5 text-xs font-medium text-[#D99A4E]">
              <span className="h-1.5 w-1.5 rounded-full bg-[#D99A4E]" />
              SaaS completo para barbearias e salões
            </span>

            <h1 className="mt-6 font-display text-4xl font-extrabold leading-[1.08] tracking-tight text-[#F5F1EB] sm:text-5xl lg:text-[3.5rem]">
              Sua barbearia ou salão no{' '}
              <span className="text-[#D99A4E]">próximo nível</span>.
            </h1>

            <p className="mt-5 max-w-xl text-base leading-relaxed text-[#A5A09A] sm:text-lg">
              Agende, organize, fidelize e cresça com o Kortaz. A plataforma completa para gestão do
              seu negócio, de forma simples, moderna e eficiente.
            </p>

            <div className="mt-8 flex flex-wrap items-center gap-3.5">
              <Link
                href="/cadastro"
                className="inline-flex items-center gap-2 rounded-xl bg-[#D99A4E] px-6 py-3.5 text-sm font-bold text-[#090909] shadow-[0_12px_32px_-12px_rgba(217,154,78,0.55)] transition-colors hover:bg-[#F2B968]"
              >
                Comece grátis agora
                <ArrowRight className="h-4 w-4" />
              </Link>
              <a
                href="#produto"
                className="inline-flex items-center gap-2 rounded-xl border border-[#292521] bg-[#151515] px-6 py-3.5 text-sm font-semibold text-[#F5F1EB] transition-colors hover:border-[#D99A4E]/50 hover:bg-[#1B1B1B]"
              >
                Conhecer o sistema
              </a>
            </div>
          </div>

          <div className="lg:col-span-6">
            <div className="relative overflow-hidden rounded-2xl border border-[#292521] bg-[#111111] shadow-[0_32px_80px_-28px_rgba(0,0,0,0.95)]">
              <div className="relative aspect-[16/10] w-full">
                <Image
                  src="/assets/hero/kortaz2-hero.jpg"
                  alt="Interior contemporâneo de barbearia e salão de luxo com iluminação bronze"
                  fill
                  priority
                  sizes="(max-width: 1024px) 100vw, 50vw"
                  className="object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-r from-[#090909]/70 via-transparent to-transparent" />
                <div className="absolute inset-0 bg-gradient-to-t from-[#090909]/75 via-transparent to-transparent" />
              </div>
              <div className="absolute bottom-4 left-4 right-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[#292521] bg-[#151515]/90 px-4 py-3 backdrop-blur-md">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-[#D99A4E]">
                    Multi-tenant em tempo real
                  </p>
                  <p className="text-xs font-medium text-[#F5F1EB]">
                    Agenda, Pix, Comissões &amp; CRM integrados
                  </p>
                </div>
                <Link
                  href="/s/barbearia-exclusiva"
                  className="inline-flex items-center gap-1.5 rounded-lg bg-[#1B1B1B] px-3 py-1.5 text-xs font-semibold text-[#F2B968] border border-[#D99A4E]/30 hover:border-[#D99A4E]"
                >
                  Ver vitrine demo
                  <ArrowRight className="h-3 w-3" />
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 5.3 SEGMENTOS ATENDIDOS */}
      <section className="border-b border-[#292521] bg-[#0C0C0C] py-8">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <p className="text-center text-xs font-medium uppercase tracking-[0.2em] text-[#A5A09A]">
            Feito para negócios de estética e atendimento com hora marcada
          </p>
          <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
            {SEGMENTS.map((seg) => (
              <div
                key={seg.label}
                className="flex items-center justify-center gap-2.5 rounded-xl border border-[#292521] bg-[#151515] px-4 py-3 text-xs font-semibold text-[#F5F1EB]"
              >
                <seg.icon className="h-4 w-4 text-[#D99A4E]" />
                <span>{seg.label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 5.4 APRESENTAÇÃO DO PRODUTO */}
      <section id="produto" className="border-b border-[#292521] py-20 sm:py-24">
        <div className="mx-auto grid max-w-7xl items-center gap-12 px-4 sm:px-6 lg:grid-cols-12 lg:px-8">
          <div className="lg:col-span-5">
            <span className="text-xs font-semibold uppercase tracking-[0.2em] text-[#D99A4E]">
              TUDO O QUE VOCÊ PRECISA
            </span>
            <h2 className="mt-3 font-display text-3xl font-bold tracking-tight text-[#F5F1EB] sm:text-4xl">
              Gestão completa em <span className="text-[#D99A4E]">um só lugar</span>.
            </h2>
            <p className="mt-4 text-sm leading-relaxed text-[#A5A09A] sm:text-base">
              Do agendamento ao financeiro, o Kortaz cuida de tudo para você focar no que realmente
              importa: seus clientes.
            </p>

            <ul className="mt-7 space-y-3">
              {PRODUCT_BENEFITS.map((benefit) => (
                <li key={benefit} className="flex items-center gap-3 text-sm text-[#F5F1EB]">
                  <CheckCircle2 className="h-4 w-4 shrink-0 text-[#D99A4E]" />
                  <span>{benefit}</span>
                </li>
              ))}
            </ul>

            <div className="mt-8">
              <a
                href="#recursos"
                className="inline-flex items-center gap-2 rounded-xl border border-[#292521] bg-[#151515] px-5 py-3 text-xs font-semibold text-[#F5F1EB] transition-colors hover:border-[#D99A4E]/60"
              >
                Explorar todos os recursos
                <ArrowRight className="h-3.5 w-3.5 text-[#D99A4E]" />
              </a>
            </div>
          </div>

          {/* Mockup realista em HTML/CSS/React do Dashboard + Smartphone */}
          <div className="relative lg:col-span-7">
            <div className="rounded-2xl border border-[#292521] bg-[#111111] p-4 shadow-[0_32px_80px_-28px_rgba(0,0,0,0.95)] sm:p-5">
              <div className="flex items-center justify-between border-b border-[#292521] pb-3">
                <div className="flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full bg-[#EF5350]/80" />
                  <span className="h-2.5 w-2.5 rounded-full bg-[#F2B968]/80" />
                  <span className="h-2.5 w-2.5 rounded-full bg-[#16C784]/80" />
                </div>
                <span className="text-[11px] font-medium text-[#A5A09A]">
                  kortaz-app.vercel.app/app
                </span>
              </div>

              <div className="mt-4 grid gap-4 sm:grid-cols-12">
                {/* Mini sidebar */}
                <div className="hidden rounded-xl border border-[#292521] bg-[#0C0C0C] p-3 sm:col-span-3 sm:block">
                  <div className="text-xs font-extrabold tracking-wider text-[#F5F1EB]">
                    KOR<span className="text-[#D99A4E]">TAZ</span>
                  </div>
                  <div className="mt-4 space-y-1.5 text-[11px]">
                    <div className="rounded-lg bg-[#D99A4E]/15 px-2.5 py-1.5 font-semibold text-[#F2B968]">
                      Início
                    </div>
                    <div className="px-2.5 py-1 text-[#A5A09A]">Agenda</div>
                    <div className="px-2.5 py-1 text-[#A5A09A]">Agendamentos</div>
                    <div className="px-2.5 py-1 text-[#A5A09A]">Clientes</div>
                    <div className="px-2.5 py-1 text-[#A5A09A]">Financeiro</div>
                    <div className="px-2.5 py-1 text-[#A5A09A]">Comissões</div>
                  </div>
                </div>

                {/* Mini dashboard main */}
                <div className="space-y-3 sm:col-span-9">
                  <div className="grid grid-cols-3 gap-2.5">
                    <div className="rounded-xl border border-[#292521] bg-[#151515] p-3">
                      <p className="text-[10px] text-[#A5A09A]">Agendamentos hoje</p>
                      <p className="mt-1 font-display text-lg font-bold text-[#F5F1EB]">24</p>
                    </div>
                    <div className="rounded-xl border border-[#292521] bg-[#151515] p-3">
                      <p className="text-[10px] text-[#A5A09A]">Faturamento hoje</p>
                      <p className="mt-1 font-display text-lg font-bold text-[#16C784]">
                        {formatCurrencyBRL(3847.5)}
                      </p>
                    </div>
                    <div className="rounded-xl border border-[#292521] bg-[#151515] p-3">
                      <p className="text-[10px] text-[#A5A09A]">Clientes</p>
                      <p className="mt-1 font-display text-lg font-bold text-[#F2B968]">842</p>
                    </div>
                  </div>

                  <div className="rounded-xl border border-[#292521] bg-[#151515] p-3.5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-[#F5F1EB]">Agenda de Hoje</span>
                      <span className="text-[11px] font-medium text-[#D99A4E]">Tempo real</span>
                    </div>
                    <div className="mt-3 space-y-2">
                      <div className="flex items-center justify-between rounded-lg bg-[#1B1B1B] px-3 py-2 text-xs">
                        <div>
                          <p className="font-semibold text-[#F5F1EB]">09:00 · Matheus Ferreira</p>
                          <p className="text-[10px] text-[#A5A09A]">Corte Degradê + Barba</p>
                        </div>
                        <span className="rounded-full bg-[#16C784]/15 px-2 py-0.5 text-[10px] font-semibold text-[#16C784]">
                          Confirmado
                        </span>
                      </div>
                      <div className="flex items-center justify-between rounded-lg bg-[#1B1B1B] px-3 py-2 text-xs">
                        <div>
                          <p className="font-semibold text-[#F5F1EB]">10:00 · Ana Souza</p>
                          <p className="text-[10px] text-[#A5A09A]">Escova &amp; Hidratação</p>
                        </div>
                        <span className="rounded-full bg-[#4299E1]/15 px-2 py-0.5 text-[10px] font-semibold text-[#4299E1]">
                          Em atendimento
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Smartphone floating preview */}
            <div className="mt-4 rounded-2xl border border-[#D99A4E]/35 bg-[#151515] p-4 shadow-2xl sm:absolute sm:-bottom-6 sm:-right-4 sm:mt-0 sm:w-56">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#D99A4E]">
                  Agendamento Mobile
                </span>
                <CalendarCheck2 className="h-3.5 w-3.5 text-[#16C784]" />
              </div>
              <p className="mt-2 font-display text-sm font-bold text-[#F5F1EB]">
                Link exclusivo 24h
              </p>
              <p className="mt-1 text-[11px] text-[#A5A09A]">
                Seu cliente escolhe serviço, profissional e horário em segundos.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 5.5 SEÇÃO DE FUNCIONALIDADES */}
      <section id="recursos" className="border-b border-[#292521] bg-[#0C0C0C] py-20 sm:py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="max-w-2xl">
            <span className="text-xs font-semibold uppercase tracking-[0.2em] text-[#D99A4E]">
              RECURSOS DA PLATAFORMA
            </span>
            <h2 className="mt-3 font-display text-3xl font-bold tracking-tight text-[#F5F1EB] sm:text-4xl">
              Ferramentas reais para cada etapa do atendimento.
            </h2>
          </div>

          <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-5">
            {FEATURES.map((feat) => (
              <div
                key={feat.title}
                className="group rounded-2xl border border-[#292521] bg-[#151515] p-5 transition-all hover:-translate-y-0.5 hover:border-[#D99A4E]/50 hover:bg-[#1B1B1B]"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-[#292521] bg-[#090909] text-[#D99A4E] transition-colors group-hover:border-[#D99A4E]/40 group-hover:text-[#F2B968]">
                  <feat.icon className="h-5 w-5" />
                </div>
                <h3 className="mt-4 font-display text-base font-bold text-[#F5F1EB]">
                  {feat.title}
                </h3>
                <p className="mt-1.5 text-xs leading-relaxed text-[#A5A09A]">{feat.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 5.6 SEÇÃO DE PLANOS */}
      <section id="planos" className="border-b border-[#292521] py-20 sm:py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <span className="text-xs font-semibold uppercase tracking-[0.2em] text-[#D99A4E]">
              PLANOS FLEXÍVEIS
            </span>
            <h2 className="mt-3 font-display text-3xl font-bold tracking-tight text-[#F5F1EB] sm:text-4xl">
              Planos que cabem no <span className="text-[#D99A4E]">seu negócio</span>.
            </h2>
            <p className="mx-auto mt-3 max-w-xl text-sm text-[#A5A09A]">
              Comece grátis e evolua conforme seu crescimento.
            </p>
          </div>

          <PlansSectionClient
            plans={plans}
            featuresByPlan={Object.fromEntries(featuresByPlanId.entries())}
          />
        </div>
      </section>

      {/* 5.7 RESULTADOS REAIS / SOBRE */}
      <section id="sobre" className="border-b border-[#292521] bg-[#0C0C0C] py-20 sm:py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col justify-between gap-6 md:flex-row md:items-end">
            <div>
              <span className="text-xs font-semibold uppercase tracking-[0.2em] text-[#D99A4E]">
                RESULTADOS &amp; CONFIABILIDADE
              </span>
              <h2 className="mt-3 font-display text-3xl font-bold tracking-tight text-[#F5F1EB] sm:text-4xl">
                Resultados reais, de quem usa.
              </h2>
            </div>
            <Link
              href="/s/barbearia-exclusiva"
              className="inline-flex items-center gap-2 text-xs font-semibold text-[#D99A4E] hover:text-[#F2B968]"
            >
              Explorar vitrine ao vivo
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>

          {realReviews.length > 0 ? (
            <div className="mt-10 grid gap-5 md:grid-cols-3">
              {realReviews.map((review) => (
                <div
                  key={review.id}
                  className="rounded-2xl border border-[#292521] bg-[#151515] p-6"
                >
                  <div className="flex items-center gap-1 text-[#F2B968]">
                    {Array.from({ length: review.rating }).map((_, idx) => (
                      <Star key={idx} className="h-3.5 w-3.5 fill-current" />
                    ))}
                  </div>
                  <p className="mt-4 text-sm leading-relaxed text-[#F5F1EB]">
                    &ldquo;{review.comment}&rdquo;
                  </p>
                  <div className="mt-5 border-t border-[#292521] pt-4">
                    <p className="text-xs font-bold text-[#F5F1EB]">{review.author}</p>
                    <p className="text-[11px] text-[#A5A09A]">{review.establishment}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="mt-10 grid gap-5 md:grid-cols-3">
              <div className="rounded-2xl border border-[#292521] bg-[#151515] p-6">
                <ShieldCheck className="h-6 w-6 text-[#16C784]" />
                <h3 className="mt-4 font-display text-lg font-bold text-[#F5F1EB]">
                  Isolamento Multi-tenant + RLS
                </h3>
                <p className="mt-2 text-xs leading-relaxed text-[#A5A09A]">
                  Dados protegidos no PostgreSQL com Row Level Security em todas as tabelas e
                  auditoria por estabelecimento.
                </p>
              </div>
              <div className="rounded-2xl border border-[#292521] bg-[#151515] p-6">
                <CalendarCheck2 className="h-6 w-6 text-[#D99A4E]" />
                <h3 className="mt-4 font-display text-lg font-bold text-[#F5F1EB]">
                  Zero conflito de agenda
                </h3>
                <p className="mt-2 text-xs leading-relaxed text-[#A5A09A]">
                  Motor de disponibilidade com bloqueio de horários, duração real por serviço e
                  confirmação imediata.
                </p>
              </div>
              <div className="rounded-2xl border border-[#292521] bg-[#151515] p-6">
                <Coins className="h-6 w-6 text-[#F2B968]" />
                <h3 className="mt-4 font-display text-lg font-bold text-[#F5F1EB]">
                  Financeiro &amp; Comissões exatas
                </h3>
                <p className="mt-2 text-xs leading-relaxed text-[#A5A09A]">
                  Cálculo automático de comissões, controle de caixa e cobrança integrada com
                  Mercado Pago.
                </p>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* 5.8 CTA FINAL */}
      <section className="relative overflow-hidden border-b border-[#292521] py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="relative overflow-hidden rounded-3xl border border-[#D99A4E]/30 bg-[#151515] p-8 sm:p-12">
            <Image
              src="/assets/gallery/kortaz2-marketing.jpg"
              alt="Profissional atendendo cliente em barbearia moderna"
              fill
              sizes="(max-width: 1280px) 100vw, 1200px"
              className="object-cover opacity-25"
            />
            <div className="relative z-10 flex flex-col items-start justify-between gap-8 lg:flex-row lg:items-center">
              <div className="max-w-2xl">
                <h2 className="font-display text-3xl font-extrabold tracking-tight text-[#F5F1EB] sm:text-4xl">
                  Eleve sua barbearia ou salão com o Kortaz.
                </h2>
                <p className="mt-3 text-sm leading-relaxed text-[#A5A09A] sm:text-base">
                  Comece agora e experimente uma gestão mais simples, eficiente e lucrativa.
                </p>
              </div>
              <Link
                href="/cadastro"
                className="inline-flex shrink-0 items-center gap-2 rounded-xl bg-[#D99A4E] px-6 py-4 text-sm font-bold text-[#090909] shadow-[0_12px_32px_-12px_rgba(217,154,78,0.55)] transition-colors hover:bg-[#F2B968]"
              >
                Criar minha conta grátis
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* 5.9 FOOTER */}
      <footer className="bg-[#090909] py-12">
        <div className="mx-auto flex max-w-7xl flex-col items-start justify-between gap-8 px-4 sm:px-6 md:flex-row md:items-center lg:px-8">
          <BrandLogo />
          <nav className="flex flex-wrap items-center gap-6 text-xs font-medium text-[#A5A09A]">
            <a href="#inicio" className="hover:text-[#F5F1EB]">
              Início
            </a>
            <a href="#recursos" className="hover:text-[#F5F1EB]">
              Recursos
            </a>
            <Link href="/precos" className="hover:text-[#F5F1EB]">
              Preços
            </Link>
            <a href="#sobre" className="hover:text-[#F5F1EB]">
              Sobre
            </a>
            <Link href="/termos" className="hover:text-[#F5F1EB]">
              Termos
            </Link>
            <Link href="/privacidade" className="hover:text-[#F5F1EB]">
              Privacidade
            </Link>
          </nav>
        </div>
        <div className="mx-auto mt-8 max-w-7xl border-t border-[#292521] px-4 pt-6 text-xs text-[#A5A09A] sm:px-6 lg:px-8">
          © {new Date().getFullYear()} Kortaz. Todos os direitos reservados.
        </div>
      </footer>
    </div>
  );
}
