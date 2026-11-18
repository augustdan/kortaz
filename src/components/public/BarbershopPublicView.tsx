'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  AlertCircle,
  Armchair,
  Award,
  Calendar,
  Check,
  ChevronLeft,
  ChevronRight,
  Clock,
  CreditCard,
  Info,
  Lock,
  Mail,
  MapPin,
  Phone,
  QrCode,
  Scissors,
  Sparkles,
  Star,
  User,
} from 'lucide-react';
import type {
  Barber,
  Branch,
  Review,
  Service,
  Tenant,
  TenantSettings,
} from '@/lib/types/domain';
import { HudCrosshair, HudPerformanceWidget, HudPillArrowButton } from '@/components/ui/HudPrimitives';
import { formatCurrencyBRL } from '@/lib/utils';

interface SlotOption {
  time: string;
  startsAt: string;
  endsAt: string;
  barberId: string;
  barberName: string;
  available: boolean;
  reason?: string;
}

interface BarbershopPublicViewProps {
  tenant: Tenant;
  settings?: TenantSettings;
  branches: Branch[];
  services: Service[];
  barbers: Barber[];
  reviews: (Review & { customerName?: string; barberName?: string })[];
  initialReviewApptId?: string;
  bookingOnlyMode?: boolean;
}

const WEEKDAYS = ['DOM', 'SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SÁB'];

function toDateStr(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function BarbershopPublicView({
  tenant,
  settings,
  branches,
  services,
  barbers,
  reviews: initialReviews,
  initialReviewApptId,
  bookingOnlyMode = false,
}: BarbershopPublicViewProps) {
  const activeBranches = useMemo(() => branches.filter((b) => b.is_active), [branches]);
  const [selectedBranchId, setSelectedBranchId] = useState<string>(activeBranches[0]?.id || '');
  const selectedBranch = useMemo(
    () => activeBranches.find((b) => b.id === selectedBranchId) || activeBranches[0],
    [activeBranches, selectedBranchId]
  );

  // Filtro unissex: Todos | Barbearia Masculina | Salão / Cabeleireiro Feminino
  const [audienceFilter, setAudienceFilter] = useState<'all' | 'male' | 'female'>('all');

  const branchServices = useMemo(
    () =>
      services.filter((s) => {
        if (!s.is_active) return false;
        if (s.branch_id && s.branch_id !== selectedBranchId) return false;
        if (audienceFilter === 'male') return s.audience === 'male' || s.audience === 'unisex' || !s.audience;
        if (audienceFilter === 'female') return s.audience === 'female' || s.audience === 'unisex';
        return true;
      }),
    [services, selectedBranchId, audienceFilter]
  );

  const branchBarbers = useMemo(
    () =>
      barbers.filter((b) => {
        if (!b.is_active || b.branch_id !== selectedBranchId) return false;
        if (audienceFilter === 'male') return b.audience_focus !== 'female';
        if (audienceFilter === 'female') return b.audience_focus === 'female' || b.audience_focus === 'unisex';
        return true;
      }),
    [barbers, selectedBranchId, audienceFilter]
  );

  const [selectedServiceIds, setSelectedServiceIds] = useState<string[]>(() =>
    branchServices[0] ? [branchServices[0].id] : []
  );
  const [selectedBarberId, setSelectedBarberId] = useState<string | null>(null);
  const [calendarMonth, setCalendarMonth] = useState<Date>(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1);
  });
  const [selectedDateStr, setSelectedDateStr] = useState<string>(() => {
    const d = new Date();
    if (d.getDay() === 0) d.setDate(d.getDate() + 1);
    return toDateStr(d);
  });

  const [slots, setSlots] = useState<SlotOption[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<SlotOption | null>(null);

  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [couponCode, setCouponCode] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'pix' | 'credit_card' | 'cash'>('pix');
  const [paymentTiming, setPaymentTiming] = useState<'on_arrival' | 'now' | 'deposit'>('on_arrival');
  const [lgpdConsent, setLgpdConsent] = useState(true);
  const [whatsappOptIn, setWhatsappOptIn] = useState(true);
  const [showAllBarbers, setShowAllBarbers] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [bookingError, setBookingError] = useState<string | null>(null);
  const [bookingSuccess, setBookingSuccess] = useState<{
    appointmentId: string;
    startsAt: string;
    barberName: string;
    totalAmount: number;
    pixQrCode?: string;
    checkoutUrl?: string;
    paymentNotice?: string;
  } | null>(null);

  const [waitlistOpen, setWaitlistOpen] = useState(false);
  const [waitlistFeedback, setWaitlistFeedback] = useState<string | null>(null);

  const [reviews, setReviews] = useState(initialReviews);
  const [reviewFormApptId, setReviewFormApptId] = useState(initialReviewApptId || '');
  const [reviewOverall, setReviewOverall] = useState(5);
  const [reviewComment, setReviewComment] = useState('');
  const [reviewStatus, setReviewStatus] = useState<string | null>(null);

  // Garante serviço selecionado ao alternar filtro Masculino / Feminino
  useEffect(() => {
    if (branchServices.length > 0 && !selectedServiceIds.some((id) => branchServices.some((s) => s.id === id))) {
      setSelectedServiceIds([branchServices[0].id]);
    }
  }, [branchServices, selectedServiceIds]);

  useEffect(() => {
    if (selectedBarberId && !branchBarbers.some((b) => b.id === selectedBarberId)) {
      setSelectedBarberId(branchBarbers[0]?.id || null);
    }
  }, [branchBarbers, selectedBarberId]);

  useEffect(() => {
    if (!selectedBranchId || selectedServiceIds.length === 0) return;
    let cancelled = false;
    async function loadSlots() {
      setLoadingSlots(true);
      setBookingError(null);
      try {
        const qs = new URLSearchParams({
          tenantId: tenant.id,
          branchId: selectedBranchId,
          date: selectedDateStr,
          serviceIds: selectedServiceIds.join(','),
          ...(selectedBarberId ? { barberId: selectedBarberId } : {}),
        });
        const res = await fetch(`/api/availability?${qs.toString()}`);
        const data = await res.json();
        if (!cancelled && res.ok) {
          setSlots(data.slots || []);
          const firstOpen = (data.slots as SlotOption[]).find((s) => s.available) || null;
          setSelectedSlot((prev) => {
            if (prev && (data.slots as SlotOption[]).some((s) => s.startsAt === prev.startsAt && s.available)) {
              return prev;
            }
            return firstOpen;
          });
        }
      } catch {
        if (!cancelled) setSlots([]);
      } finally {
        if (!cancelled) setLoadingSlots(false);
      }
    }
    loadSlots();
    return () => {
      cancelled = true;
    };
  }, [tenant.id, selectedBranchId, selectedDateStr, selectedBarberId, selectedServiceIds]);

  const selectedServicesList = useMemo(
    () => services.filter((s) => selectedServiceIds.includes(s.id)),
    [services, selectedServiceIds]
  );

  const totalDuration = useMemo(
    () => selectedServicesList.reduce((acc, s) => acc + s.duration_minutes, 0),
    [selectedServicesList]
  );

  const totalPrice = useMemo(
    () => selectedServicesList.reduce((acc, s) => acc + s.price, 0),
    [selectedServicesList]
  );

  const activeBarberObj = useMemo(
    () => barbers.find((b) => b.id === (selectedBarberId || selectedSlot?.barberId)) || null,
    [barbers, selectedBarberId, selectedSlot]
  );

  const calendarDays = useMemo(() => {
    const year = calendarMonth.getFullYear();
    const month = calendarMonth.getMonth();
    const firstDayOfMonth = new Date(year, month, 1);
    const startWeekday = firstDayOfMonth.getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const cells: { dateStr: string; day: number; inMonth: boolean; isPast: boolean }[] = [];
    const todayStr = toDateStr(new Date());

    for (let i = 0; i < startWeekday; i++) {
      const prevDate = new Date(year, month, 1 - (startWeekday - i));
      const ds = toDateStr(prevDate);
      cells.push({ dateStr: ds, day: prevDate.getDate(), inMonth: false, isPast: ds < todayStr });
    }
    for (let d = 1; d <= daysInMonth; d++) {
      const cur = new Date(year, month, d);
      const ds = toDateStr(cur);
      cells.push({ dateStr: ds, day: d, inMonth: true, isPast: ds < todayStr });
    }
    return cells;
  }, [calendarMonth]);

  const monthLabel = useMemo(
    () =>
      new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric' }).format(calendarMonth),
    [calendarMonth]
  );

  const selectedDateDisplay = useMemo(() => {
    const [y, m, d] = selectedDateStr.split('-').map(Number);
    return new Intl.DateTimeFormat('pt-BR', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    }).format(new Date(y, m - 1, d));
  }, [selectedDateStr]);

  const currentStep = useMemo(() => {
    if (bookingSuccess) return 4;
    if (selectedSlot && customerName.trim()) return 4;
    if (selectedSlot) return 3;
    if (selectedBarberId !== undefined) return 2;
    return 1;
  }, [bookingSuccess, selectedSlot, customerName, selectedBarberId]);

  const toggleService = (id: string) => {
    setSelectedServiceIds((prev) => {
      if (prev.includes(id)) {
        return prev.length > 1 ? prev.filter((item) => item !== id) : prev;
      }
      return [...prev, id];
    });
  };

  async function handleConfirmBooking(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedSlot || !selectedBranch) {
      setBookingError('Selecione uma data e um horário disponível.');
      return;
    }
    if (!lgpdConsent) {
      setBookingError('É necessário aceitar a Política de Privacidade (LGPD) para prosseguir.');
      return;
    }

    setSubmitting(true);
    setBookingError(null);
    try {
      const res = await fetch('/api/appointments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tenantId: tenant.id,
          branchId: selectedBranch.id,
          barberId: selectedBarberId || selectedSlot.barberId,
          serviceIds: selectedServiceIds,
          startsAt: selectedSlot.startsAt,
          customerName,
          customerPhone,
          customerEmail,
          paymentMethod,
          paymentTiming,
          couponCode: couponCode || null,
          source: 'online',
          lgpdConsent,
          whatsappOptIn,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setBookingError(data.error || 'Não foi possível concluir o agendamento.');
        return;
      }

      let pixQrCode: string | undefined;
      let checkoutUrl: string | undefined;
      let paymentNotice: string | undefined;

      if (paymentTiming !== 'on_arrival') {
        const payAmount =
          paymentTiming === 'deposit' && data.appointment.deposit_amount > 0
            ? data.appointment.deposit_amount
            : data.appointment.total_amount;

        const payRes = await fetch('/api/payments/checkout', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            tenantId: tenant.id,
            appointmentId: data.appointment.id,
            method: paymentTiming === 'deposit' ? 'deposit' : paymentMethod,
            amount: payAmount,
            paymentType: paymentTiming === 'deposit' ? 'deposit' : 'full',
            payerEmail: customerEmail || undefined,
          }),
        });
        const payData = await payRes.json();
        if (payRes.ok) {
          pixQrCode = payData.pixQrCode;
          checkoutUrl = payData.checkoutUrl || payData.ticketUrl;
        } else {
          paymentNotice =
            payData.error ||
            'Agendamento confirmado! Pagamento pendente para acerto presencial até a configuração do gateway.';
        }
      }

      setBookingSuccess({
        appointmentId: data.appointment.id,
        startsAt: data.appointment.starts_at,
        barberName: data.barber?.name || selectedSlot.barberName,
        totalAmount: data.appointment.total_amount,
        pixQrCode,
        checkoutUrl,
        paymentNotice,
      });

      setSlots((prev) =>
        prev.map((s) => (s.startsAt === selectedSlot.startsAt ? { ...s, available: false } : s))
      );
    } catch {
      setBookingError('Erro de conexão ao registrar o agendamento.');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleJoinWaitlist() {
    if (!selectedBranch || !selectedServiceIds[0] || !customerName || !customerPhone) {
      setWaitlistFeedback('Informe seu nome e telefone na coluna ao lado para entrar na lista de espera.');
      return;
    }
    const res = await fetch('/api/appointments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        kind: 'waitlist',
        tenantId: tenant.id,
        branchId: selectedBranch.id,
        serviceId: selectedServiceIds[0],
        barberId: selectedBarberId,
        desiredDate: selectedDateStr,
        desiredPeriod: 'any',
        customerName,
        customerPhone,
        customerEmail,
      }),
    });
    if (res.ok) {
      setWaitlistFeedback('Você entrou na Lista de Espera automática! Avisaremos se liberar vaga.');
      setWaitlistOpen(false);
    }
  }

  async function handleSendReview(e: React.FormEvent) {
    e.preventDefault();
    setReviewStatus(null);
    const res = await fetch('/api/customers', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        kind: 'review',
        tenantId: tenant.id,
        appointmentId: reviewFormApptId,
        barberRating: reviewOverall,
        serviceRating: reviewOverall,
        ambienceRating: reviewOverall,
        overallRating: reviewOverall,
        comment: reviewComment,
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      setReviewStatus(data.error || 'Não foi possível enviar a avaliação.');
      return;
    }
    setReviews((prev) => [{ ...data.review, customerName: 'Cliente verificado' }, ...prev]);
    setReviewComment('');
    setReviewFormApptId('');
    setReviewStatus('Avaliação publicada com sucesso! Obrigado pelo feedback.');
  }

  const averageRating = useMemo(() => {
    if (reviews.length === 0) return '4.9';
    const avg = reviews.reduce((acc, r) => acc + r.overall_rating, 0) / reviews.length;
    return avg.toFixed(1);
  }, [reviews]);

  const visibleBarbers = showAllBarbers ? branchBarbers : branchBarbers.slice(0, 5);

  return (
    <div className="min-h-screen bg-[#090909] text-[#F5F1EB]">
      {/* TOP NAVIGATION */}
      <header className="sticky top-0 z-40 border-b border-[#D99A4E]/15 bg-[#090909]/90 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
          <Link href={`/s/${tenant.slug}`} className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-[#D99A4E]/35 bg-[#151515]">
              <Scissors className="h-5 w-5 text-[#D99A4E]" />
            </div>
            <div className="leading-none">
              <span className="block text-[9px] font-semibold uppercase tracking-[0.26em] text-[#D99A4E]">
                BARBEARIA &amp; SALÃO
              </span>
              <span className="font-display text-lg font-semibold tracking-wider text-[#F5F1EB] uppercase">
                {tenant.name}
              </span>
            </div>
          </Link>

          {!bookingOnlyMode && (
            <nav className="hidden items-center gap-7 text-xs font-medium tracking-[0.18em] text-[#A5A09A] md:flex">
              <a href="#inicio" className="hover:text-[#D99A4E]">
                INÍCIO
              </a>
              <a href="#agendar" className="hover:text-[#D99A4E]">
                SERVIÇOS
              </a>
              <a href="#agendar" className="hover:text-[#D99A4E]">
                ESPECIALISTAS
              </a>
              <a href="#galeria" className="hover:text-[#D99A4E]">
                GALERIA
              </a>
              <a href="#contato" className="hover:text-[#D99A4E]">
                CONTATO
              </a>
            </nav>
          )}

          <div className="flex items-center gap-2.5">
            <Link
              href={`/cliente?slug=${tenant.slug}`}
              className="rounded-xl border border-[#292521] bg-[#151515] px-3 py-2 text-xs font-semibold text-[#F5F1EB] transition-colors hover:border-[#D99A4E]/60"
            >
              Meus Horários
            </Link>
            <Link
              href="/login"
              className="hidden text-xs font-medium text-[#A5A09A] hover:text-[#F5F1EB] sm:inline-block"
            >
              Área da Equipe
            </Link>
            <HudPillArrowButton href="#agendar" label="Agendar" />
          </div>
        </div>
      </header>

      {/* HERO EDITORIAL MARROM ESPRESSO & BRONZE (Dual Showcase Masculino + Feminino) */}
      {!bookingOnlyMode && (
        <section
          id="inicio"
          className="relative overflow-hidden border-b border-[#D99A4E]/15 bg-[#090909]"
        >
          <div className="hud-radial-glow pointer-events-none absolute inset-0" />
          <div className="relative mx-auto grid max-w-7xl items-center gap-10 px-4 py-14 sm:px-6 lg:grid-cols-12 lg:py-20 lg:px-8">
            <div className="lg:col-span-6">
              <p className="mb-3 text-xs font-semibold uppercase tracking-[0.3em] text-[#D99A4E]">
                BARBEARIA MASCULINA &bull; SALÃO FEMININO &bull; VISAGISMO
              </p>
              <h1 className="font-display text-5xl font-semibold leading-[1.05] text-[#F5F1EB] sm:text-6xl">
                {settings?.custom_public_headline?.split(',')[0] || 'Seu estilo'},
                <br />
                <span className="text-[#D99A4E]">
                  {settings?.custom_public_headline?.split(',')[1]?.trim() || 'nossa assinatura.'}
                </span>
              </h1>
              <p className="mt-5 max-w-md text-base leading-relaxed text-[#A5A09A]">
                {settings?.custom_public_subheadline ||
                  'Barbearia masculina de precisão e salão feminino de alta estética em um só lugar.'}
              </p>

              <div className="mt-8 flex flex-wrap items-center gap-4">
                <HudPillArrowButton href="#agendar" label="Agendar agora" />
                <div className="hud-panel flex items-center gap-2 rounded-full px-4 py-2.5 text-xs text-[#A5A09A]">
                  <Star className="h-4 w-4 fill-[#D99A4E] text-[#D99A4E]" />
                  <span className="font-semibold text-[#F5F1EB]">{averageRating}</span>
                  <span>({reviews.length} avaliações reais)</span>
                </div>
              </div>
            </div>

            <div className="relative lg:col-span-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="relative overflow-hidden rounded-2xl border border-[#D99A4E]/25 bg-[#151515]">
                  <HudCrosshair className="absolute left-2 top-2 z-10" />
                  <img
                    src="/assets/hero/hero-hud-barber-man.jpg"
                    alt="Barbearia Masculina"
                    className="aspect-[4/5] w-full object-cover"
                  />
                  <span className="absolute bottom-3 left-3 rounded-full bg-[#090909]/85 px-3 py-1 text-[10px] font-semibold uppercase tracking-wider text-[#D99A4E]">
                    Barbearia Masculina
                  </span>
                </div>
                <div className="relative mt-6 overflow-hidden rounded-2xl border border-[#D99A4E]/25 bg-[#151515]">
                  <HudCrosshair className="absolute right-2 top-2 z-10" />
                  <img
                    src="/assets/hero/hero-hud-woman-salon.jpg"
                    alt="Salão Feminino e Cabeleireira"
                    className="aspect-[4/5] w-full object-cover"
                  />
                  <span className="absolute bottom-3 left-3 rounded-full bg-[#090909]/85 px-3 py-1 text-[10px] font-semibold uppercase tracking-wider text-[#D99A4E]">
                    Salão &amp; Cabeleireira
                  </span>
                </div>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* COCKPIT DE AGENDAMENTO HUD EM 4 COLUNAS */}
      <section id="agendar" className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="hud-panel relative rounded-3xl p-5 sm:p-8">
          <HudCrosshair className="absolute left-3 top-3" />
          <HudCrosshair className="absolute right-3 top-3" />

          {/* Header do Card + Seletor de Filial + Filtro Masculino/Feminino */}
          <div className="flex flex-col justify-between gap-4 border-b border-[#D99A4E]/15 pb-6 lg:flex-row lg:items-center">
            <div>
              <h2 className="font-display text-3xl font-medium text-[#F5F1EB] sm:text-4xl">
                Agende seu horário
              </h2>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                {/* Abas Masculino / Feminino / Todos */}
                {(
                  [
                    { key: 'all', label: 'Todos os Serviços' },
                    { key: 'male', label: 'Barbearia Masculina' },
                    { key: 'female', label: 'Salão Feminino / Cabeleireira' },
                  ] as const
                ).map((tab) => (
                  <button
                    key={tab.key}
                    type="button"
                    onClick={() => setAudienceFilter(tab.key)}
                    className={`rounded-full border px-3.5 py-1.5 text-xs font-semibold transition-all ${
                      audienceFilter === tab.key
                        ? 'border-[#D99A4E] bg-[#D99A4E] text-[#090909]'
                        : 'border-[#D99A4E]/20 bg-[#090909]/60 text-[#A5A09A] hover:text-[#F5F1EB]'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}

                {activeBranches.length > 1 && (
                  <div className="ml-0 flex flex-wrap items-center gap-1.5 sm:ml-3">
                    {activeBranches.map((branch) => (
                      <button
                        key={branch.id}
                        type="button"
                        onClick={() => setSelectedBranchId(branch.id)}
                        className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
                          branch.id === selectedBranchId
                            ? 'border-[#D99A4E] bg-[#D99A4E]/15 text-[#D99A4E]'
                            : 'border-[#292521] bg-[#151515] text-[#A5A09A]'
                        }`}
                      >
                        {branch.name}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Clock className="h-5 w-5 text-[#D99A4E]" />
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#D99A4E]">
                  ATENDIMENTO
                </p>
                <p className="text-sm font-medium text-[#F5F1EB]">
                  {selectedBranch?.opening_hours_label || 'SEG - SÁB: 09h às 20h'}
                </p>
              </div>
            </div>
          </div>

          {/* Stepper Horizontal */}
          <div className="grid grid-cols-2 gap-4 py-6 sm:grid-cols-4">
            {[
              { step: 1, title: 'Serviço', sub: 'Escolha o serviço' },
              { step: 2, title: 'Especialista', sub: 'Barbeiro ou Cabeleireira' },
              { step: 3, title: 'Data e hora', sub: 'Selecione data e horário' },
              { step: 4, title: 'Confirmar', sub: 'Revise e confirme' },
            ].map((item) => {
              const active = currentStep >= item.step;
              return (
                <div key={item.step} className="flex items-center gap-3">
                  <span
                    className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                      active
                        ? 'bg-[#D99A4E] text-[#090909]'
                        : 'border border-[#292521] bg-[#151515] text-[#A5A09A]'
                    }`}
                  >
                    {item.step}
                  </span>
                  <div className="leading-tight">
                    <p className="text-sm font-semibold text-[#F5F1EB]">{item.title}</p>
                    <p className="text-[11px] text-[#A5A09A]">{item.sub}</p>
                  </div>
                </div>
              );
            })}
          </div>

          {/* 4 Colunas Interativas */}
          <div className="grid gap-5 lg:grid-cols-12">
            {/* COLUNA 1 — SERVIÇOS */}
            <div className="flex flex-col justify-between rounded-2xl border border-[#D99A4E]/15 bg-[#090909]/75 p-4 lg:col-span-3">
              <div>
                <div className="mb-4 flex items-center gap-2 text-sm font-semibold text-[#F5F1EB]">
                  <Scissors className="h-4 w-4 text-[#D99A4E]" />
                  <span>Escolha o serviço</span>
                </div>

                <div className="space-y-2.5 max-h-96 overflow-y-auto pr-1">
                  {branchServices.map((svc) => {
                    const selected = selectedServiceIds.includes(svc.id);
                    return (
                      <button
                        key={svc.id}
                        type="button"
                        onClick={() => toggleService(svc.id)}
                        className={`flex w-full items-center justify-between rounded-xl border px-3.5 py-3 text-left transition-all ${
                          selected
                            ? 'border-[#D99A4E] bg-[#1B1B1B]'
                            : 'border-[#292521] bg-[#151515] hover:border-[#D99A4E]/40'
                        }`}
                      >
                        <div>
                          <span className="block text-[9px] font-semibold uppercase tracking-wider text-[#D99A4E]">
                            {svc.category}
                          </span>
                          <p className="text-sm font-medium text-[#F5F1EB]">{svc.name}</p>
                          <p className="mt-0.5 text-xs text-[#A5A09A]">
                            {formatCurrencyBRL(svc.price)} &bull; {svc.duration_minutes} min
                          </p>
                        </div>
                        <span
                          className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border ${
                            selected
                              ? 'border-[#D99A4E] bg-[#D99A4E] text-[#090909]'
                              : 'border-white/25'
                          }`}
                        >
                          {selected && <Check className="h-3 w-3 stroke-[3]" />}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="mt-4 flex items-start gap-2 rounded-xl border border-[#D99A4E]/10 bg-[#151515]/80 p-3 text-[11px] text-[#A5A09A]">
                <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#D99A4E]" />
                <span>
                  Inclui diagnóstico personalizado e finalização. Selecione quantos serviços desejar.
                </span>
              </div>
            </div>

            {/* COLUNA 2 — ESPECIALISTAS (BARBEIROS & CABELEIREIRAS) */}
            <div className="flex flex-col justify-between rounded-2xl border border-[#D99A4E]/15 bg-[#090909]/75 p-4 lg:col-span-3">
              <div>
                <div className="mb-4 flex items-center gap-2 text-sm font-semibold text-[#F5F1EB]">
                  <User className="h-4 w-4 text-[#D99A4E]" />
                  <span>Escolha o especialista</span>
                </div>

                <div className="space-y-2.5 max-h-96 overflow-y-auto pr-1">
                  <button
                    type="button"
                    onClick={() => setSelectedBarberId(null)}
                    className={`flex w-full items-center justify-between rounded-xl border px-3 py-2.5 text-left transition-all ${
                      selectedBarberId === null
                        ? 'border-[#D99A4E] bg-[#1B1B1B]'
                        : 'border-[#292521] bg-[#151515] hover:border-[#D99A4E]/40'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-[#D99A4E]/35 bg-[#1B1B1B]">
                        <Sparkles className="h-4 w-4 text-[#D99A4E]" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-[#F5F1EB]">Qualquer disponível</p>
                        <p className="text-[11px] text-[#D99A4E]">Agenda inteligente</p>
                      </div>
                    </div>
                    <span
                      className={`flex h-5 w-5 items-center justify-center rounded-full border ${
                        selectedBarberId === null
                          ? 'border-[#D99A4E] bg-[#D99A4E] text-[#090909]'
                          : 'border-white/25'
                      }`}
                    >
                      {selectedBarberId === null && <Check className="h-3 w-3 stroke-[3]" />}
                    </span>
                  </button>

                  {visibleBarbers.map((barber) => {
                    const selected = selectedBarberId === barber.id;
                    return (
                      <button
                        key={barber.id}
                        type="button"
                        onClick={() => setSelectedBarberId(barber.id)}
                        className={`flex w-full items-center justify-between rounded-xl border px-3 py-2.5 text-left transition-all ${
                          selected
                            ? 'border-[#D99A4E] bg-[#1B1B1B]'
                            : 'border-[#292521] bg-[#151515] hover:border-[#D99A4E]/40'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <img
                            src={barber.avatar_url || '/assets/barbers/barber-lucas.jpg'}
                            alt={barber.name}
                            className="h-10 w-10 rounded-lg object-cover"
                          />
                          <div>
                            <p className="text-sm font-medium text-[#F5F1EB]">{barber.name}</p>
                            <p className="text-[10px] text-[#A5A09A]">{barber.specialty}</p>
                            <p className="flex items-center gap-1 text-[11px] text-[#D99A4E]">
                              <Star className="h-3 w-3 fill-[#D99A4E] text-[#D99A4E]" />
                              <span>{barber.rating_avg.toFixed(1)}</span>
                            </p>
                          </div>
                        </div>
                        <span
                          className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border ${
                            selected
                              ? 'border-[#D99A4E] bg-[#D99A4E] text-[#090909]'
                              : 'border-white/25'
                          }`}
                        >
                          {selected && <Check className="h-3 w-3 stroke-[3]" />}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {branchBarbers.length > 5 && (
                <button
                  type="button"
                  onClick={() => setShowAllBarbers((v) => !v)}
                  className="mt-4 flex items-center justify-between text-xs font-medium text-[#A5A09A] hover:text-[#D99A4E]"
                >
                  <span>{showAllBarbers ? 'Mostrar menos' : 'Ver todos os especialistas'}</span>
                  <ChevronRight className="h-4 w-4" />
                </button>
              )}
            </div>

            {/* COLUNA 3 — DATA E HORÁRIOS */}
            <div className="flex flex-col rounded-2xl border border-[#D99A4E]/15 bg-[#090909]/75 p-4 lg:col-span-3">
              <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-[#F5F1EB]">
                <Calendar className="h-4 w-4 text-[#D99A4E]" />
                <span>Escolha a data</span>
              </div>

              <div className="rounded-xl border border-[#D99A4E]/15 bg-[#151515] p-3">
                <div className="mb-3 flex items-center justify-between">
                  <button
                    type="button"
                    aria-label="Mês anterior"
                    onClick={() =>
                      setCalendarMonth((d) => new Date(d.getFullYear(), d.getMonth() - 1, 1))
                    }
                    className="rounded p-1 text-[#A5A09A] hover:bg-white/5 hover:text-[#F5F1EB]"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                  <span className="text-xs font-semibold capitalize text-[#F5F1EB]">
                    {monthLabel}
                  </span>
                  <button
                    type="button"
                    aria-label="Próximo mês"
                    onClick={() =>
                      setCalendarMonth((d) => new Date(d.getFullYear(), d.getMonth() + 1, 1))
                    }
                    className="rounded p-1 text-[#A5A09A] hover:bg-white/5 hover:text-[#F5F1EB]"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>

                <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-semibold text-[#A5A09A]">
                  {WEEKDAYS.map((w) => (
                    <span key={w}>{w}</span>
                  ))}
                </div>

                <div className="mt-2 grid grid-cols-7 gap-1 text-center">
                  {calendarDays.map((cell) => {
                    const isSelected = cell.dateStr === selectedDateStr;
                    return (
                      <button
                        key={cell.dateStr}
                        type="button"
                        disabled={!cell.inMonth || cell.isPast}
                        onClick={() => setSelectedDateStr(cell.dateStr)}
                        className={`mx-auto flex h-7 w-7 items-center justify-center rounded-full text-xs transition-all ${
                          !cell.inMonth || cell.isPast
                            ? 'cursor-not-allowed text-white/15'
                            : isSelected
                              ? 'bg-[#D99A4E] font-bold text-[#090909]'
                              : 'text-[#F5F1EB] hover:bg-white/10'
                        }`}
                      >
                        {cell.day}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="mt-4">
                <p className="mb-2.5 text-xs font-semibold text-[#F5F1EB]">Escolha o horário</p>

                {loadingSlots ? (
                  <p className="py-4 text-center text-xs text-[#A5A09A]">
                    Consultando agenda em tempo real...
                  </p>
                ) : slots.filter((s) => s.available).length === 0 ? (
                  <div className="rounded-xl border border-[#292521] bg-[#151515] p-3 text-center">
                    <p className="text-xs text-[#A5A09A]">Sem horários disponíveis nesta data.</p>
                    <button
                      type="button"
                      onClick={() => setWaitlistOpen(true)}
                      className="mt-2 text-xs font-semibold text-[#D99A4E] underline"
                    >
                      Entrar na Lista de Espera automática
                    </button>
                  </div>
                ) : (
                  <div className="grid max-h-48 grid-cols-3 gap-2 overflow-y-auto pr-1">
                    {slots.map((slot) => {
                      const isSelected = selectedSlot?.startsAt === slot.startsAt;
                      return (
                        <button
                          key={slot.startsAt}
                          type="button"
                          disabled={!slot.available}
                          title={slot.reason || `Disponível com ${slot.barberName}`}
                          onClick={() => setSelectedSlot(slot)}
                          className={`rounded-lg border py-2 text-xs font-semibold transition-all ${
                            !slot.available
                              ? 'cursor-not-allowed border-[#292521]/70 bg-[#151515]/40 text-white/20 line-through'
                              : isSelected
                                ? 'border-[#D99A4E] bg-[#D99A4E] text-[#090909]'
                                : 'border-[#292521] bg-[#151515] text-[#F5F1EB] hover:border-[#D99A4E]/60'
                          }`}
                        >
                          {slot.time}
                        </button>
                      );
                    })}
                  </div>
                )}

                {waitlistOpen && (
                  <div className="mt-3 rounded-xl border border-[#D99A4E]/40 bg-[#151515] p-3 text-xs">
                    <p className="font-semibold text-[#D99A4E]">Lista de Espera</p>
                    <p className="mt-1 text-[#A5A09A]">
                      Preencha nome e telefone ao lado para receber aviso automático caso haja vaga.
                    </p>
                    <button
                      type="button"
                      onClick={handleJoinWaitlist}
                      className="mt-2 w-full rounded-full bg-[#D99A4E] py-1.5 font-semibold text-[#090909]"
                    >
                      Confirmar na Lista de Espera
                    </button>
                  </div>
                )}

                {waitlistFeedback && (
                  <p className="mt-2 text-xs text-[#16C784]">{waitlistFeedback}</p>
                )}
              </div>
            </div>

            {/* COLUNA 4 — RESUMO E CONFIRMAÇÃO */}
            <form
              onSubmit={handleConfirmBooking}
              className="flex flex-col justify-between rounded-2xl border border-[#D99A4E]/15 bg-[#090909]/75 p-4 lg:col-span-3"
            >
              <div>
                <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-[#F5F1EB]">
                  <Sparkles className="h-4 w-4 text-[#D99A4E]" />
                  <span>Resumo do agendamento</span>
                </div>

                {bookingSuccess ? (
                  <div className="space-y-3 rounded-xl border border-[#16C784]/40 bg-[#16C784]/10 p-4">
                    <div className="flex items-center gap-2 text-[#16C784]">
                      <Check className="h-5 w-5" />
                      <span className="text-sm font-bold">Horário Confirmado!</span>
                    </div>
                    <p className="text-xs text-[#F5F1EB]">
                      Atendimento com <strong>{bookingSuccess.barberName}</strong> em{' '}
                      <strong>{selectedDateDisplay}</strong> às{' '}
                      <strong>{selectedSlot?.time}</strong>.
                    </p>
                    <p className="text-xs text-[#A5A09A]">
                      Código:{' '}
                      <code className="text-[#D99A4E]">{bookingSuccess.appointmentId}</code>
                    </p>
                    {bookingSuccess.pixQrCode && (
                      <div className="rounded bg-[#090909] p-2.5 text-xs">
                        <p className="mb-1 flex items-center gap-1 font-semibold text-[#D99A4E]">
                          <QrCode className="h-3.5 w-3.5" /> Pix Copia e Cola gerado:
                        </p>
                        <p className="break-all font-mono text-[10px] text-[#A5A09A]">
                          {bookingSuccess.pixQrCode}
                        </p>
                      </div>
                    )}
                    {bookingSuccess.checkoutUrl && (
                      <a
                        href={bookingSuccess.checkoutUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="block rounded-full bg-[#D99A4E] py-2 text-center text-xs font-bold text-[#090909]"
                      >
                        Abrir Checkout Mercado Pago
                      </a>
                    )}
                    {bookingSuccess.paymentNotice && (
                      <p className="text-[11px] text-[#D99A4E]">{bookingSuccess.paymentNotice}</p>
                    )}
                    <button
                      type="button"
                      onClick={() => setBookingSuccess(null)}
                      className="w-full rounded-full border border-[#292521] py-2 text-xs text-[#F5F1EB] hover:bg-white/5"
                    >
                      Fazer novo agendamento
                    </button>
                  </div>
                ) : (
                  <div className="space-y-2.5 text-xs">
                    <div className="flex justify-between border-b border-[#292521]/70 pb-2">
                      <span className="text-[#A5A09A]">Serviço(s)</span>
                      <span className="text-right font-medium text-[#F5F1EB]">
                        {selectedServicesList.map((s) => s.name).join(' + ')}
                      </span>
                    </div>
                    <div className="flex justify-between border-b border-[#292521]/70 pb-2">
                      <span className="text-[#A5A09A]">Especialista</span>
                      <span className="font-medium text-[#F5F1EB]">
                        {activeBarberObj?.name || 'Agenda Inteligente'}
                      </span>
                    </div>
                    <div className="flex justify-between border-b border-[#292521]/70 pb-2">
                      <span className="text-[#A5A09A]">Data</span>
                      <span className="font-medium text-[#F5F1EB]">{selectedDateDisplay}</span>
                    </div>
                    <div className="flex justify-between border-b border-[#292521]/70 pb-2">
                      <span className="text-[#A5A09A]">Horário / Duração</span>
                      <span className="font-medium text-[#F5F1EB]">
                        {selectedSlot?.time || '--:--'} ({totalDuration} min)
                      </span>
                    </div>
                    <div className="flex items-center justify-between pt-1">
                      <span className="text-sm font-semibold text-[#F5F1EB]">Total</span>
                      <span className="text-lg font-bold text-[#D99A4E]">
                        {formatCurrencyBRL(totalPrice)}
                      </span>
                    </div>

                    <div className="space-y-2 pt-2">
                      <input
                        type="text"
                        required
                        placeholder="Seu nome completo"
                        value={customerName}
                        onChange={(e) => setCustomerName(e.target.value)}
                        className="w-full rounded-lg border border-[#292521] bg-[#151515] px-3 py-2 text-xs text-[#F5F1EB] placeholder:text-[#A5A09A]/60 focus:border-[#D99A4E] focus:outline-none"
                      />
                      <input
                        type="tel"
                        required
                        placeholder="WhatsApp (11) 99999-9999"
                        value={customerPhone}
                        onChange={(e) => setCustomerPhone(e.target.value)}
                        className="w-full rounded-lg border border-[#292521] bg-[#151515] px-3 py-2 text-xs text-[#F5F1EB] placeholder:text-[#A5A09A]/60 focus:border-[#D99A4E] focus:outline-none"
                      />
                      <div className="grid grid-cols-2 gap-2">
                        <input
                          type="email"
                          placeholder="E-mail (opcional)"
                          value={customerEmail}
                          onChange={(e) => setCustomerEmail(e.target.value)}
                          className="w-full rounded-lg border border-[#292521] bg-[#151515] px-3 py-2 text-xs text-[#F5F1EB] placeholder:text-[#A5A09A]/60 focus:border-[#D99A4E] focus:outline-none"
                        />
                        <input
                          type="text"
                          placeholder="Cupom (VOLTA15)"
                          value={couponCode}
                          onChange={(e) => setCouponCode(e.target.value)}
                          className="w-full rounded-lg border border-[#292521] bg-[#151515] px-3 py-2 text-xs uppercase text-[#F5F1EB] placeholder:normal-case placeholder:text-[#A5A09A]/60 focus:border-[#D99A4E] focus:outline-none"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <select
                          aria-label="Forma de pagamento"
                          value={paymentMethod}
                          onChange={(e) =>
                            setPaymentMethod(e.target.value as 'pix' | 'credit_card' | 'cash')
                          }
                          className="rounded-lg border border-[#292521] bg-[#151515] px-2.5 py-2 text-xs text-[#F5F1EB] focus:border-[#D99A4E] focus:outline-none"
                        >
                          <option value="pix">Pix</option>
                          <option value="credit_card">Cartão</option>
                          <option value="cash">Dinheiro</option>
                        </select>
                        <select
                          aria-label="Momento do pagamento"
                          value={paymentTiming}
                          onChange={(e) =>
                            setPaymentTiming(e.target.value as 'on_arrival' | 'now' | 'deposit')
                          }
                          className="rounded-lg border border-[#292521] bg-[#151515] px-2.5 py-2 text-xs text-[#F5F1EB] focus:border-[#D99A4E] focus:outline-none"
                        >
                          <option value="on_arrival">Pagar no local</option>
                          <option value="deposit">Sinal antecipado</option>
                          <option value="now">Pagar agora online</option>
                        </select>
                      </div>

                      <label className="flex items-start gap-2 pt-1 text-[11px] text-[#A5A09A]">
                        <input
                          type="checkbox"
                          checked={lgpdConsent}
                          onChange={(e) => setLgpdConsent(e.target.checked)}
                          className="mt-0.5 accent-[#D99A4E]"
                        />
                        <span>
                          Concordo com a{' '}
                          <Link href="/privacidade" className="text-[#D99A4E] underline">
                            Política de Privacidade (LGPD)
                          </Link>
                          .
                        </span>
                      </label>
                      <label className="flex items-center gap-2 text-[11px] text-[#A5A09A]">
                        <input
                          type="checkbox"
                          checked={whatsappOptIn}
                          onChange={(e) => setWhatsappOptIn(e.target.checked)}
                          className="accent-[#D99A4E]"
                        />
                        <span>Receber confirmação via WhatsApp</span>
                      </label>
                    </div>
                  </div>
                )}
              </div>

              {!bookingSuccess && (
                <div className="mt-4">
                  {bookingError && (
                    <div className="mb-3 flex items-start gap-2 rounded-lg border border-[#EF5350]/40 bg-[#EF5350]/10 p-2.5 text-[11px] text-[#EF5350]">
                      <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                      <span>{bookingError}</span>
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={submitting || !selectedSlot}
                    className="w-full rounded-full bg-[#D99A4E] py-3 text-xs font-bold uppercase tracking-[0.15em] text-[#090909] transition-all hover:bg-[#F2B968] disabled:opacity-50"
                  >
                    {submitting ? 'CONFIRMANDO...' : 'CONFIRMAR AGENDAMENTO'}
                  </button>

                  <p className="mt-2.5 flex items-center justify-center gap-1.5 text-[11px] text-[#A5A09A]">
                    <Lock className="h-3 w-3 text-[#D99A4E]" />
                    <span>Seus dados estão protegidos pela LGPD.</span>
                  </p>
                </div>
              )}
            </form>
          </div>
        </div>
      </section>

      {/* DIFERENCIAIS + GALERIA UNISSEX + RODAPÉ */}
      {!bookingOnlyMode && (
        <>
          <section className="border-y border-[#D99A4E]/10 py-10">
            <div className="mx-auto grid max-w-7xl gap-5 px-4 sm:grid-cols-2 sm:px-6 lg:grid-cols-4 lg:px-8">
              {[
                {
                  icon: Calendar,
                  title: 'Agendamento instantâneo',
                  desc: 'Escolha corte masculino ou salão feminino sem instalar app.',
                },
                {
                  icon: Award,
                  title: 'Especialistas premiados',
                  desc: 'Barbeiros visagistas, cabeleireiras e coloristas certificadas.',
                },
                {
                  icon: Armchair,
                  title: 'Ambiente Espresso Luxury',
                  desc: 'Conforto reservado, toalha quente e tratamentos capilares.',
                },
                {
                  icon: CreditCard,
                  title: 'Pix & Pagamento fácil',
                  desc: 'Pague antecipado, sinal ou presencialmente com transparência.',
                },
              ].map((item) => (
                <div key={item.title} className="hud-panel flex items-start gap-4 rounded-2xl p-5">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[#D99A4E]/30 bg-[#151515]">
                    <item.icon className="h-5 w-5 text-[#D99A4E]" />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-[#F5F1EB]">{item.title}</h3>
                    <p className="mt-1 text-xs leading-relaxed text-[#A5A09A]">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section id="galeria" className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
            <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.25em] text-[#D99A4E]">
                  PORTFÓLIO EDITORIAL
                </p>
                <h2 className="mt-1 font-display text-3xl font-semibold text-[#F5F1EB]">
                  Barbearia Masculina &amp; Salão Feminino
                </h2>
              </div>
              <HudPerformanceWidget
                title="Satisfação"
                metric={`${averageRating} ★`}
                caption="Índice de aprovação real"
                className="w-60"
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {[
                { src: '/assets/hero/hero-hud-barber-man.jpg', label: 'Barbearia & Fade' },
                { src: '/assets/services/service-women-hair.jpg', label: 'Escova & Colorimetria' },
                { src: '/assets/hero/hero-hud-tools-pedestal.jpg', label: 'Precisão & Insumos' },
                { src: '/assets/hero/hero-hud-woman-salon.jpg', label: 'Visagismo Feminino' },
              ].map((img) => (
                <div
                  key={img.label}
                  className="group relative aspect-[4/3] overflow-hidden rounded-2xl border border-[#D99A4E]/20 bg-[#151515]"
                >
                  <img
                    src={img.src}
                    alt={img.label}
                    className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#090909] via-transparent to-transparent" />
                  <span className="absolute bottom-3 left-3 text-xs font-medium text-[#F5F1EB]">
                    {img.label}
                  </span>
                </div>
              ))}
            </div>
          </section>

          {/* AVALIAÇÕES */}
          <section className="mx-auto max-w-7xl px-4 pb-16 sm:px-6 lg:px-8">
            <div className="hud-panel rounded-3xl p-6 sm:p-8">
              <p className="text-xs font-semibold uppercase tracking-[0.25em] text-[#D99A4E]">
                AVALIAÇÕES VERIFICADAS
              </p>
              <h2 className="mt-1 font-display text-3xl font-semibold text-[#F5F1EB]">
                Experiência dos Clientes ({averageRating} ★)
              </h2>

              <div className="mt-6 grid gap-4 md:grid-cols-2">
                {reviews.slice(0, 4).map((rev) => (
                  <div
                    key={rev.id}
                    className="rounded-2xl border border-[#D99A4E]/15 bg-[#090909]/75 p-4"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-semibold text-[#F5F1EB]">
                        {rev.customerName || 'Cliente Verificado'}
                      </span>
                      <div className="flex items-center gap-0.5">
                        {Array.from({ length: rev.overall_rating }).map((_, idx) => (
                          <Star
                            key={idx}
                            className="h-3.5 w-3.5 fill-[#D99A4E] text-[#D99A4E]"
                          />
                        ))}
                      </div>
                    </div>
                    <p className="mt-2 text-xs leading-relaxed text-[#A5A09A]">
                      &ldquo;{rev.comment}&rdquo;
                    </p>
                  </div>
                ))}
              </div>

              {reviewFormApptId && (
                <form
                  onSubmit={handleSendReview}
                  className="mt-6 rounded-2xl border border-[#D99A4E]/35 bg-[#090909] p-4"
                >
                  <p className="text-sm font-semibold text-[#D99A4E]">
                    Avaliar atendimento #{reviewFormApptId}
                  </p>
                  <div className="mt-3 flex flex-wrap items-center gap-3">
                    <select
                      value={reviewOverall}
                      onChange={(e) => setReviewOverall(Number(e.target.value))}
                      className="rounded-lg border border-[#292521] bg-[#151515] px-3 py-2 text-xs"
                    >
                      {[5, 4, 3, 2, 1].map((n) => (
                        <option key={n} value={n}>
                          {n} Estrelas
                        </option>
                      ))}
                    </select>
                    <input
                      type="text"
                      required
                      placeholder="Conte como foi sua experiência..."
                      value={reviewComment}
                      onChange={(e) => setReviewComment(e.target.value)}
                      className="flex-1 rounded-lg border border-[#292521] bg-[#151515] px-3 py-2 text-xs"
                    />
                    <button
                      type="submit"
                      className="rounded-full bg-[#D99A4E] px-5 py-2 text-xs font-bold text-[#090909]"
                    >
                      Enviar Avaliação
                    </button>
                  </div>
                  {reviewStatus && <p className="mt-2 text-xs text-[#D99A4E]">{reviewStatus}</p>}
                </form>
              )}
            </div>
          </section>

          <footer id="contato" className="border-t border-[#D99A4E]/15 bg-[#090909] py-12">
            <div className="mx-auto grid max-w-7xl gap-8 px-4 sm:grid-cols-2 sm:px-6 lg:grid-cols-5 lg:px-8">
              <div className="lg:col-span-2">
                <div className="flex items-center gap-3">
                  <Scissors className="h-5 w-5 text-[#D99A4E]" />
                  <span className="font-display text-lg font-semibold uppercase tracking-wider text-[#F5F1EB]">
                    {tenant.name}
                  </span>
                </div>
                <p className="mt-3 max-w-sm text-xs leading-relaxed text-[#A5A09A]">
                  {tenant.description}
                </p>
              </div>
              <div>
                <h4 className="text-xs font-semibold uppercase tracking-widest text-[#F5F1EB]">
                  SERVIÇOS
                </h4>
                <ul className="mt-3 space-y-2 text-xs text-[#A5A09A]">
                  {services.slice(0, 5).map((s) => (
                    <li key={s.id}>{s.name}</li>
                  ))}
                </ul>
              </div>
              <div>
                <h4 className="text-xs font-semibold uppercase tracking-widest text-[#F5F1EB]">
                  CONTATO
                </h4>
                <ul className="mt-3 space-y-2 text-xs text-[#A5A09A]">
                  <li className="flex items-center gap-2">
                    <Phone className="h-3.5 w-3.5 text-[#D99A4E]" />
                    <span>{selectedBranch?.phone || tenant.phone}</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Mail className="h-3.5 w-3.5 text-[#D99A4E]" />
                    <span>{tenant.email}</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#D99A4E]" />
                    <span>
                      {selectedBranch?.address} — {selectedBranch?.city}/{selectedBranch?.state}
                    </span>
                  </li>
                </ul>
              </div>
              <div>
                <h4 className="text-xs font-semibold uppercase tracking-widest text-[#F5F1EB]">
                  FUNCIONAMENTO
                </h4>
                <ul className="mt-3 space-y-2 text-xs text-[#A5A09A]">
                  <li>Segunda a Sexta: 09h às 20h</li>
                  <li>Sábado: 09h às 20h</li>
                  <li>Domingo: Fechado</li>
                </ul>
              </div>
            </div>
            <div className="mx-auto mt-10 flex max-w-7xl flex-col items-center justify-between gap-2 border-t border-[#292521]/70 px-4 pt-6 text-[11px] text-[#A5A09A] sm:flex-row sm:px-6 lg:px-8">
              <span>
                &copy; {new Date().getFullYear()} {tenant.name}. Tecnologia{' '}
                <Link href="/" className="text-[#D99A4E] hover:underline">
                  Kortaz OS
                </Link>
                .
              </span>
              <div className="flex gap-4">
                <Link href="/termos" className="hover:text-[#F5F1EB]">
                  Termos de Uso
                </Link>
                <Link href="/privacidade" className="hover:text-[#F5F1EB]">
                  Privacidade &amp; LGPD
                </Link>
              </div>
            </div>
          </footer>
        </>
      )}
    </div>
  );
}
