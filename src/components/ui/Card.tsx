import React from 'react';
import { cn } from '@/lib/utils';

export function Card({
  children,
  elevated = false,
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement> & { elevated?: boolean }) {
  return (
    <div
      className={cn(
        'rounded-2xl border transition-colors',
        elevated
          ? 'border-[#D99A4E]/25 bg-[#1B1B1B] shadow-[0_18px_40px_-20px_rgba(0,0,0,0.85)]'
          : 'border-[#292521] bg-[#151515] shadow-[0_12px_32px_-18px_rgba(0,0,0,0.75)]',
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}

export function CardHeader({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('flex items-center justify-between gap-4 border-b border-[#292521]/80 px-5 py-4', className)}>
      {children}
    </div>
  );
}

export function CardTitle({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <h3 className={cn('font-display text-base font-semibold tracking-tight text-[#F5F1EB]', className)}>
      {children}
    </h3>
  );
}

export function CardContent({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <div className={cn('p-5', className)}>{children}</div>;
}
