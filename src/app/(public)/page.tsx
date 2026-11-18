import Link from 'next/link';
import {
  Calendar,
  Check,
  CreditCard,
  Scissors,
  ShieldCheck,
  Sparkles,
  Users,
} from 'lucide-react';
import { BrandLogo } from '@/components/ui/BrandLogo';
import {
  HudCrosshair,
  HudDotPill,
  HudFrame,
  HudPerformanceWidget,
  HudPillArrowButton,
} from '@/components/ui/HudPrimitives';
import { readDb } from '@/lib/server/store';
import { formatCurrencyBRL } from '@/lib/utils';

export const dynamic = 'force-dynamic';

export default async function HomeLandingPage() {
  const db = await readDb();
  const plans = [...db.subscription_plans]
    .filter((p) => p.is_active)
    .sort((a, b) => a.sort_order - b.sort_order);

  return (
    <div className="min-h-screen overflow-x-hidden bg-[#0E0906] text-[#F7EFE6]">
      {/* HEADER MINIMALISTA HUD */}
      <header className="sticky top-0 z-50 border-b border-[#D49B6A]/10 bg-[#0E0906]/85 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
          <BrandLogo subtitle="BARBEARIA & SALÃO OS" title="KOR" accent="TAZ" />

          <nav className="hidden items-center gap-8 text-xs font-medium tracking-widest text-[#B59E8D] md:flex">
            <a href="#arquitetura" className="transition-colors hover:text-[#F7EFE6]">
              TECNOLOGIA
            </a>
            <a href="#unissex" className="transition-colors hover:text-[#F7EFE6]">
              BARBEARIA &amp; SALÃO
            </a>
            <Link href="/precos" className="transition-colors hover:text-[#F7EFE6]">
              PLANOS
            </Link>
            <Link href="/s/barbearia-exclusiva" className="transition-colors hover:text-[#D49B6A]">
              DEMO AO VIVO
            </Link>
          </nav>

          <div className="flex items-center gap-3">
            <Link
              href="/login"
              className="hidden rounded-full border border-[#D49B6A]/25 px-4 py-2 text-xs font-medium text-[#F7EFE6] transition-colors hover:border-[#D49B6A] sm:inline-block"
            >
              Entrar
            </Link>
            <HudPillArrowButton href="/cadastro" label="Começar" />
          </div>
        </div>
      </header>

      {/* =====================================================================
          PAINEL 1 — HERO "KORTAZ TECH" (Inspirado no 1º painel da referência)
          ===================================================================== */}
      <section className="relative overflow-hidden border-b border-[#D49B6A]/10 py-14 sm:py-20">
        {/* Glow radial marrom/bronze ao centro */}
        <div className="hud-radial-glow pointer-events-none absolute inset-0" />

        <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between text-[11px] uppercase tracking-[0.26em] text-[#B59E8D]">
            <span>• APRESENTAÇÃO KORTAZ OS</span>
            <span className="hidden sm:inline">BARBEARIAS MASCULINAS &amp; SALÕES FEMININOS</span>
          </div>

          {/* Título gigante ao fundo + 3 cartões de vidro inclinados */}
          <div className="relative mt-6 flex flex-col items-center text-center">
            <h1 className="pointer-events-none select-none font-serif text-6xl font-semibold tracking-tight text-[#F7EFE6]/15 sm:text-8xl lg:text-[9.5rem] lg:leading-none">
              Kortaz Tech
            </h1>

            {/* Grid de composição central com Callout lateral e cartões 3D */}
            <div className="relative -mt-6 grid w-full items-center gap-8 lg:-mt-14 lg:grid-cols-12">
              {/* Esquerda: Copy + Botão Pílula */}
              <div className="order-2 flex flex-col items-start text-left lg:order-1 lg:col-span-4">
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#D49B6A]">
                  GESTÃO DE ALTA ESTÉTICA
                </p>
                <p className="mt-3 text-sm leading-relaxed text-[#B59E8D]">
                  Soluções inteligentes feitas para simplificar agendamentos, pagamentos via Pix,
                  comissões e fidelidade — tanto para barbearias masculinas quanto para salões e
                  cabeleireiras femininas.
                </p>
                <div className="mt-6 flex flex-wrap items-center gap-3">
                  <HudPillArrowButton href="/cadastro" label="Começar" />
                  <Link
                    href="/s/barbearia-exclusiva"
                    className="rounded-full border border-[#D49B6A]/25 px-4 py-2.5 text-xs font-medium text-[#D49B6A] transition-colors hover:border-[#D49B6A] hover:bg-[#D49B6A]/10"
                  >
                    Abrir Demo Unissex
                  </Link>
                </div>
              </div>

              {/* Centro: 3 Placas Translúcidas em Perspectiva (inspirado nos 3 cartões flutuantes) */}
              <div className="order-1 flex justify-center lg:order-2 lg:col-span-5">
                <div className="relative flex h-72 w-full max-w-md items-center justify-center sm:h-80">
                  {/* Card Traseiro (Escuro) */}
                  <div className="hud-panel absolute left-6 top-6 h-48 w-40 -rotate-12 rounded-2xl p-4 sm:w-44">
                    <Sparkles className="h-5 w-5 text-[#D49B6A]" />
                    <p className="mt-10 text-[10px] uppercase tracking-widest text-[#B59E8D]">
                      SALÃO FEMININO
                    </p>
                    <p className="mt-1 font-serif text-lg font-semibold text-[#F7EFE6]">
                      Mechas &amp; Visagismo
                    </p>
                  </div>

                  {/* Card Intermediário (Conhaque Brilhante) */}
                  <div className="absolute z-10 h-52 w-44 -rotate-3 rounded-2xl border border-[#F7EFE6]/30 bg-gradient-to-br from-[#E5B386]/90 via-[#B87A4B]/80 to-[#3D2212]/95 p-4 text-[#0E0906] shadow-2xl sm:w-48">
                    <div className="flex items-center justify-between">
                      <Scissors className="h-5 w-5 text-[#0E0906]" />
                      <span className="rounded-full bg-[#0E0906]/20 px-2 py-0.5 text-[10px] font-bold">
                        PIX REAL
                      </span>
                    </div>
                    <p className="mt-14 text-[10px] font-bold uppercase tracking-widest text-[#0E0906]/75">
                      BARBEARIA &amp; SALÃO
                    </p>
                    <p className="mt-1 font-serif text-xl font-bold leading-tight text-[#0E0906]">
                      Agenda Anti-Conflito
                    </p>
                  </div>

                  {/* Card Frontal Direito (Vidro Espresso) */}
                  <div className="hud-panel absolute bottom-4 right-5 z-20 h-48 w-40 rotate-12 rounded-2xl p-4 sm:w-44">
                    <CreditCard className="h-5 w-5 text-[#D49B6A]" />
                    <p className="mt-12 text-[10px] uppercase tracking-widest text-[#B59E8D]">
                      COMISSÕES &amp; CAIXA
                    </p>
                    <p className="mt-1 font-serif text-lg font-semibold text-[#F7EFE6]">
                      Repasse Automático
                    </p>
                  </div>
                </div>
              </div>

              {/* Direita: Callout HUD "+15K Atendimentos" + Moldura Editorial */}
              <div className="order-3 flex flex-col items-end gap-4 lg:col-span-3">
                <div className="w-full max-w-[240px] border-l border-[#D49B6A]/40 pl-4 text-left">
                  <div className="flex items-baseline gap-2">
                    <span className="font-mono text-2xl font-bold text-[#F7EFE6]">+15K</span>
                    <span className="text-xs text-[#B59E8D]">Clientes atendidos</span>
                  </div>
                  <div className="mt-2 flex items-center gap-2 text-xs text-[#D49B6A]">
                    <span className="h-2 w-2 rounded-full bg-[#F7EFE6] shadow-[0_0_8px_#D49B6A]" />
                    <span>Sistema seguro com RLS</span>
                  </div>
                </div>

                <HudFrame className="w-full max-w-[240px] overflow-hidden rounded-xl p-1.5">
                  <img
                    src="/assets/hero/hero-hud-barber-man.jpg"
                    alt="Barbearia masculina em ambiente marrom espresso"
                    className="aspect-[4/3] w-full rounded-lg object-cover"
                  />
                  <div className="flex items-center justify-between px-2 py-1.5 text-[10px] text-[#B59E8D]">
                    <span>BARBEARIA &amp; ESTÉTICA</span>
                    <span className="text-[#D49B6A]">24/7 ONLINE</span>
                  </div>
                </HudFrame>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* =====================================================================
          PAINEL 2 — SHOWCASE CROSSHAIR COM PEDESTAL DE FERRAMENTAS (Painel 2)
          ===================================================================== */}
      <section
        id="arquitetura"
        className="relative border-b border-[#D49B6A]/10 bg-[#120B07] py-16 sm:py-24"
      >
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <HudFrame className="rounded-3xl p-6 sm:p-12">
            <div className="grid items-center gap-10 lg:grid-cols-12">
              {/* Esquerda: Mini Card + Descrição */}
              <div className="space-y-4 lg:col-span-3">
                <div className="hud-panel overflow-hidden rounded-2xl p-3">
                  <img
                    src="/assets/services/service-women-hair.jpg"
                    alt="Finalização feminina em salão de beleza"
                    className="aspect-square w-full rounded-xl object-cover"
                  />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-[#F7EFE6]">
                    Experiência Unissex Real
                  </h3>
                  <p className="mt-1 text-xs leading-relaxed text-[#B59E8D]">
                    Serviços e agendas específicas para barbeiros masculinos e cabeleireiras /
                    coloristas femininas.
                  </p>
                </div>
              </div>

              {/* Centro: Título + Pedestal de Ferramentas */}
              <div className="text-center lg:col-span-6">
                <h2 className="font-serif text-3xl font-medium leading-tight text-[#F7EFE6] sm:text-4xl">
                  Gestão moderna para{' '}
                  <span className="text-[#D49B6A]">operações fluidas e lucrativas</span>
                </h2>

                <div className="relative mx-auto mt-6 max-w-md overflow-hidden rounded-2xl border border-[#D49B6A]/20 bg-[#0E0906]">
                  <img
                    src="/assets/hero/hero-hud-tools-pedestal.jpg"
                    alt="Ferramentas de barbearia e salão em bronze sobre pedra escura"
                    className="aspect-[16/11] w-full object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#0E0906] via-transparent to-transparent" />
                  <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between text-[11px] text-[#F7EFE6]">
                    <span className="rounded-full bg-[#0E0906]/80 px-3 py-1 border border-[#D49B6A]/30">
                      Estoque + Consumo por Serviço
                    </span>
                    <span className="rounded-full bg-[#D49B6A] px-3 py-1 font-bold text-[#0E0906]">
                      Zero Conflitos
                    </span>
                  </div>
                </div>
              </div>

              {/* Direita: Callout + Botão Dot Pill */}
              <div className="flex flex-col items-start space-y-6 lg:col-span-3">
                <div className="border-l border-[#D49B6A]/40 pl-4">
                  <span className="mb-2 block h-2 w-2 rounded-full bg-[#F7EFE6] shadow-[0_0_10px_#D49B6A]" />
                  <p className="text-xs leading-relaxed text-[#B59E8D]">
                    Controle de caixa com sangria, suprimento, comissões imutáveis e pagamento Pix
                    Mercado Pago validado por webhook.
                  </p>
                </div>
                <HudDotPill href="/s/barbearia-exclusiva" label="Explorar agora" />
              </div>
            </div>
          </HudFrame>
        </div>
      </section>

      {/* =====================================================================
          PAINEL 3 — RETRATO EDITORIAL + WIDGET "PERFORMANCE +135%" (Painel 3)
          ===================================================================== */}
      <section
        id="unissex"
        className="relative overflow-hidden border-b border-[#D49B6A]/10 py-16 sm:py-24"
      >
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              'radial-gradient(circle at 48% 50%, rgba(168, 107, 62, 0.34) 0%, rgba(72, 40, 22, 0.22) 42%, rgba(14, 9, 6, 0.96) 78%)',
          }}
        />

        <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid items-center gap-10 lg:grid-cols-12">
            {/* Retrato Editorial com Halo Circular + Card Performance */}
            <div className="relative lg:col-span-6">
              <div className="relative mx-auto max-w-md">
                {/* Halo circular arquitetônico */}
                <div className="pointer-events-none absolute -left-8 -top-8 h-64 w-64 rounded-full border border-[#F7EFE6]/15" />

                <div className="overflow-hidden rounded-3xl border border-[#D49B6A]/25 bg-[#18100C] shadow-2xl">
                  <img
                    src="/assets/hero/hero-hud-woman-salon.jpg"
                    alt="Salão de beleza e cabeleireira feminina em tons marrom bronze"
                    className="aspect-[4/5] w-full object-cover"
                  />
                </div>

                {/* Widget Flutuante Performance +135% */}
                <HudPerformanceWidget
                  title="Performance"
                  metric="+135%"
                  caption="Retenção & Ticket Médio"
                  className="mt-4 sm:absolute sm:-left-10 sm:bottom-10 sm:mt-0 sm:w-64"
                />
              </div>
            </div>

            {/* Direita: Tipografia Editorial + Botão "Ver plataforma >" */}
            <div className="space-y-6 lg:col-span-6">
              <p className="text-xs font-semibold uppercase tracking-[0.26em] text-[#D49B6A]">
                ESTÉTICA PARA ELE E PARA ELA
              </p>
              <h2 className="font-serif text-4xl font-medium leading-[1.08] text-[#F7EFE6] sm:text-6xl">
                Gestão Inteligente{' '}
                <span className="text-[#D49B6A]">para Barbearias e Salões Modernos</span>
              </h2>
              <p className="max-w-lg text-sm leading-relaxed text-[#B59E8D]">
                Da barbearia clássica ao salão de beleza e colorimetria feminina: centralize
                agendamentos recorrentes, lista de espera automática, recuperação de clientes
                inativos no WhatsApp, cartão fidelidade e multiunidades no mesmo painel.
              </p>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="hud-panel rounded-2xl p-4">
                  <p className="text-xs font-bold text-[#D49B6A]">BARBEARIA MASCULINA</p>
                  <p className="mt-1 text-xs text-[#B59E8D]">
                    Skin fade, barboterapia, pacotes mensais e comissão instantânea por barbeiro.
                  </p>
                </div>
                <div className="hud-panel rounded-2xl p-4">
                  <p className="text-xs font-bold text-[#D49B6A]">SALÃO &amp; CABELEIREIRA</p>
                  <p className="mt-1 text-xs text-[#B59E8D]">
                    Mechas, escova, cronograma capilar com baixa automática de insumos no estoque.
                  </p>
                </div>
              </div>

              <div className="pt-2 flex flex-wrap items-center gap-4">
                <HudPillArrowButton href="/login" label="Ver plataforma" />
                <Link
                  href="/s/barbearia-exclusiva"
                  className="text-xs font-semibold text-[#D49B6A] underline underline-offset-4 hover:text-[#E5B386]"
                >
                  Testar agendamento completo &rarr;
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* =====================================================================
          PAINEL 4 — FRAME HUD & PLANOS TRANSPARENTES (Painel 4 da referência)
          ===================================================================== */}
      <section className="relative py-16 sm:py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="relative mx-auto max-w-3xl border border-[#D49B6A]/20 bg-[#18100C]/35 px-6 py-12 text-center">
            <HudCrosshair className="absolute -left-1.5 -top-1.5" />
            <HudCrosshair className="absolute -right-1.5 -top-1.5" />
            <HudCrosshair className="absolute -bottom-1.5 -left-1.5" />
            <HudCrosshair className="absolute -bottom-1.5 -right-1.5" />

            <div className="mb-6 flex flex-wrap items-center justify-center gap-4 sm:justify-between">
              <HudDotPill label="Recursos chave" />
              <HudDotPill label="Sistema seguro multi-tenant" />
            </div>

            <h2 className="font-serif text-3xl font-medium text-[#F7EFE6] sm:text-5xl">
              Agendamento, caixa e fidelidade{' '}
              <span className="font-semibold text-[#D49B6A]">simples para o seu time.</span>
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-xs leading-relaxed text-[#B59E8D] sm:text-sm">
              Construído para transações rápidas no celular do profissional e controle financeiro
              rigoroso para proprietários e redes multiunidades.
            </p>
          </div>

          {/* Planos SaaS Transparentes */}
          <div className="mt-14 grid gap-4 md:grid-cols-3 lg:grid-cols-6">
            {plans.map((plan) => (
              <div
                key={plan.id}
                className={`flex flex-col justify-between rounded-2xl p-5 transition-all ${
                  plan.is_popular
                    ? 'border border-[#D49B6A] bg-[#241710] shadow-xl shadow-[#D49B6A]/10'
                    : 'hud-panel'
                }`}
              >
                <div>
                  {plan.is_popular && (
                    <span className="mb-2 inline-block rounded-full bg-[#D49B6A] px-2.5 py-0.5 text-[10px] font-bold uppercase text-[#0E0906]">
                      Mais Escolhido
                    </span>
                  )}
                  <h3 className="text-sm font-bold text-[#F7EFE6]">{plan.name}</h3>
                  <p className="mt-2 text-2xl font-bold text-[#D49B6A]">
                    {plan.is_custom_pricing
                      ? 'Sob consulta'
                      : plan.price_monthly === 0
                        ? 'R$ 0'
                        : formatCurrencyBRL(plan.price_monthly)}
                    {!plan.is_custom_pricing && (
                      <span className="text-[11px] font-normal text-[#B59E8D]">/mês</span>
                    )}
                  </p>
                  <p className="mt-2 text-[11px] text-[#B59E8D]">{plan.tagline}</p>

                  <ul className="mt-4 space-y-1.5 text-[11px] text-[#F7EFE6]">
                    <li className="flex items-center gap-1.5">
                      <Check className="h-3.5 w-3.5 text-[#45C486]" />
                      <span>
                        {plan.max_barbers === null
                          ? 'Profissionais ilimitados'
                          : `Até ${plan.max_barbers} profissiona${plan.max_barbers > 1 ? 'is' : 'l'}`}
                      </span>
                    </li>
                    <li className="flex items-center gap-1.5">
                      <Check className="h-3.5 w-3.5 text-[#45C486]" />
                      <span>
                        {plan.max_monthly_appointments === null
                          ? 'Agendamentos ilimitados'
                          : `Até ${plan.max_monthly_appointments}/mês`}
                      </span>
                    </li>
                    <li className="flex items-center gap-1.5">
                      <Check className="h-3.5 w-3.5 text-[#45C486]" />
                      <span>
                        {plan.max_branches >= 999
                          ? 'Unidades ilimitadas'
                          : `${plan.max_branches} unidade${plan.max_branches > 1 ? 's' : ''}`}
                      </span>
                    </li>
                  </ul>
                </div>

                <Link
                  href={`/cadastro?plan=${plan.code}`}
                  className={`mt-5 block rounded-full py-2 text-center text-xs font-bold transition-colors ${
                    plan.is_popular
                      ? 'bg-[#D49B6A] text-[#0E0906] hover:bg-[#E5B386]'
                      : 'border border-[#D49B6A]/30 text-[#F7EFE6] hover:border-[#D49B6A]'
                  }`}
                >
                  Selecionar
                </Link>
              </div>
            ))}
          </div>

          <div className="mt-6 flex items-start gap-3 rounded-2xl border border-[#D49B6A]/15 bg-[#18100C] p-4 text-xs text-[#B59E8D]">
            <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-[#45C486]" />
            <span>
              <strong className="text-[#F7EFE6]">Sem taxas ocultas:</strong> o valor acima cobre 100%
              da plataforma Kortaz OS. Taxas do Mercado Pago (Pix/Cartão) e WhatsApp Business API
              são cobradas diretamente pelos respectivos provedores.
            </span>
          </div>
        </div>
      </section>

      <footer className="border-t border-[#D49B6A]/15 py-8 text-xs text-[#B59E8D]">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 px-4 sm:flex-row sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <Users className="h-4 w-4 text-[#D49B6A]" />
            <span>
              &copy; {new Date().getFullYear()} Kortaz OS &mdash; Barbearias Masculinas &amp;
              Salões de Beleza.
            </span>
          </div>
          <div className="flex gap-6">
            <Link href="/precos" className="hover:text-[#F7EFE6]">
              Preços
            </Link>
            <Link href="/termos" className="hover:text-[#F7EFE6]">
              Termos
            </Link>
            <Link href="/privacidade" className="hover:text-[#F7EFE6]">
              Privacidade &amp; LGPD
            </Link>
            <Link href="/admin" className="text-[#D49B6A] hover:underline">
              Super Admin
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
