import React from 'react';
import { cn } from '@/lib/utils';

export type BadgeVariant =
  | 'bronze'
  | 'success'
  | 'danger'
  | 'info'
  | 'purple'
  | 'warning'
  | 'neutral';

const BADGE_CLASSES: Record<BadgeVariant, string> = {
  bronze: 'border-[#D99A4E]/35 bg-[#D99A4E]/15 text-[#F2B968]',
  success: 'border-[#16C784]/35 bg-[#16C784]/15 text-[#16C784]',
  danger: 'border-[#EF5350]/35 bg-[#EF5350]/15 text-[#EF5350]',
  info: 'border-[#4299E1]/35 bg-[#4299E1]/15 text-[#4299E1]',
  purple: 'border-[#A66BEB]/35 bg-[#A66BEB]/15 text-[#A66BEB]',
  warning: 'border-[#F2B968]/35 bg-[#F2B968]/15 text-[#F2B968]',
  neutral: 'border-[#292521] bg-[#1B1B1B] text-[#A5A09A]',
};

export function Badge({
  children,
  variant = 'neutral',
  className,
}: {
  children: React.ReactNode;
  variant?: BadgeVariant;
  className?: string;
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold tracking-wide',
        BADGE_CLASSES[variant],
        className
      )}
    >
      {children}
    </span>
  );
}
