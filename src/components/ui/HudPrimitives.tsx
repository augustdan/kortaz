import React from 'react';
import Link from 'next/link';
import { ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

export function HudCrosshair({ className }: { className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        'pointer-events-none select-none font-mono text-xs leading-none text-[#D99A4E]/60',
        className
      )}
    >
      +
    </span>
  );
}

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
        'relative rounded-2xl border border-[#292521] bg-[#151515]/80',
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
      <span className="pl-2.5 pr-1 text-xs font-semibold tracking-wide text-[#090909]">
        {label}
      </span>
      <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#090909] text-[#F2B968] transition-transform group-hover:translate-x-0.5">
        <ChevronRight className="h-3.5 w-3.5 stroke-[2.5]" />
      </span>
    </>
  );

  const baseCls = cn(
    'group inline-flex items-center gap-2 rounded-full bg-[#D99A4E] p-1.5 transition-all hover:bg-[#F2B968]',
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
      <span className="h-2 w-2 rounded-full bg-[#D99A4E]" />
      <span className="text-xs font-medium tracking-wide text-[#F5F1EB]">{label}</span>
    </>
  );

  const cls = cn(
    'inline-flex items-center gap-2.5 rounded-full border border-[#292521] bg-[#151515] px-4 py-2 transition-colors hover:border-[#D99A4E]/50',
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
        'rounded-2xl border border-[#292521] bg-[#151515] p-4 sm:p-5',
        className
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-[#D99A4E]" />
          <span className="text-xs font-medium text-[#A5A09A]">{title}</span>
        </div>
        <span className="font-display text-sm font-bold text-[#F2B968]">{metric}</span>
      </div>
      <p className="mt-1 text-[11px] text-[#A5A09A]">{caption}</p>
    </div>
  );
}
