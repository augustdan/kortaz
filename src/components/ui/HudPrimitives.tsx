import React from 'react';
import Link from 'next/link';
import { ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * Marcador "+" de mira arquitetônica estilo HUD (inspirado nos cantos geométricos da referência)
 */
export function HudCrosshair({ className }: { className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        'pointer-events-none select-none font-mono text-xs leading-none text-[#D49B6A]/70',
        className
      )}
    >
      +
    </span>
  );
}

/**
 * Moldura HUD com linhas finas e "+" nos 4 vértices
 */
export function HudFrame({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'relative border border-[#D49B6A]/18 bg-[#18100C]/40 backdrop-blur-md',
        className
      )}
    >
      <HudCrosshair className="absolute -left-1.5 -top-1.5" />
      <HudCrosshair className="absolute -right-1.5 -top-1.5" />
      <HudCrosshair className="absolute -bottom-1.5 -left-1.5" />
      <HudCrosshair className="absolute -bottom-1.5 -right-1.5" />
      {children}
    </div>
  );
}

/**
 * Botão pílula com seta circular à direita ("Começar >", "Ver plataforma >")
 */
export function HudPillArrowButton({
  href,
  label,
  onClick,
  className,
}: {
  href?: string;
  label: string;
  onClick?: () => void;
  className?: string;
}) {
  const inner = (
    <>
      <span className="pl-2 pr-1 text-xs font-medium tracking-wide text-[#F7EFE6]">
        {label}
      </span>
      <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#F7EFE6] text-[#0E0906] transition-transform group-hover:translate-x-0.5">
        <ChevronRight className="h-3.5 w-3.5 stroke-[2.5]" />
      </span>
    </>
  );

  const baseCls = cn(
    'hud-pill group inline-flex items-center gap-3 rounded-full p-1.5 pr-1.5 transition-all hover:border-[#D49B6A]/65',
    className
  );

  if (href) {
    return (
      <Link href={href} className={baseCls}>
        {inner}
      </Link>
    );
  }
  return (
    <button type="button" onClick={onClick} className={baseCls}>
      {inner}
    </button>
  );
}

/**
 * Botão/Tag pílula com ponto luminoso à esquerda ("• Explorar agora", "• Recursos chave")
 */
export function HudDotPill({
  href,
  label,
  className,
}: {
  href?: string;
  label: string;
  className?: string;
}) {
  const inner = (
    <>
      <span className="h-2 w-2 rounded-full bg-[#F7EFE6] shadow-[0_0_10px_rgba(212,155,106,0.9)]" />
      <span className="text-xs font-medium tracking-wide text-[#F7EFE6]">{label}</span>
    </>
  );

  const cls = cn(
    'hud-pill inline-flex items-center gap-2.5 rounded-full px-4 py-2 transition-all hover:border-[#D49B6A]/65',
    className
  );

  if (href) {
    return (
      <Link href={href} className={cls}>
        {inner}
      </Link>
    );
  }
  return <div className={cls}>{inner}</div>;
}

/**
 * Widget flutuante translúcido "Performance" com gráfico SVG em curva suave (igual ao 3º painel)
 */
export function HudPerformanceWidget({
  title = 'Performance',
  metric = '+135%',
  caption = 'Faturamento recorrente',
  className,
}: {
  title?: string;
  metric?: string;
  caption?: string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'hud-panel relative overflow-hidden rounded-2xl p-4 sm:p-5',
        className
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-full bg-[#F7EFE6] shadow-[0_0_12px_#D49B6A]" />
          <span className="text-xs font-medium text-[#F7EFE6]">{title}</span>
        </div>
        <span className="text-[10px] uppercase tracking-widest text-[#D49B6A]">AO VIVO</span>
      </div>

      <svg
        viewBox="0 0 220 82"
        className="mt-3 h-16 w-full overflow-visible"
        fill="none"
      >
        <defs>
          <linearGradient id="kortazCurveGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#D49B6A" stopOpacity="0.45" />
            <stop offset="100%" stopColor="#D49B6A" stopOpacity="0" />
          </linearGradient>
        </defs>
        <path
          d="M4 66 C 28 62, 42 22, 68 38 C 94 54, 112 64, 138 30 C 160 2, 184 12, 214 10 L 214 78 L 4 78 Z"
          fill="url(#kortazCurveGrad)"
        />
        <path
          d="M4 66 C 28 62, 42 22, 68 38 C 94 54, 112 64, 138 30 C 160 2, 184 12, 214 10"
          stroke="#F7EFE6"
          strokeOpacity="0.88"
          strokeWidth="2.2"
          strokeLinecap="round"
        />
        <circle cx="138" cy="30" r="4" fill="#D49B6A" stroke="#F7EFE6" strokeWidth="1.5" />
      </svg>

      <div className="mt-1 flex items-baseline justify-between">
        <span className="text-[11px] text-[#B59E8D]">{caption}</span>
        <span className="font-mono text-xl font-bold text-[#F7EFE6]">{metric}</span>
      </div>
    </div>
  );
}
