import React from 'react';
import { cn } from '@/lib/utils';

export function EmptyState({
  icon,
  title,
  description,
  action,
  className,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center rounded-2xl border border-dashed border-[#292521] bg-[#151515]/60 px-6 py-12 text-center',
        className
      )}
    >
      <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-[#292521] bg-[#1B1B1B] text-[#D99A4E]">
        {icon}
      </div>
      <h3 className="mt-4 font-display text-base font-semibold text-[#F5F1EB]">{title}</h3>
      <p className="mt-1 max-w-sm text-xs leading-relaxed text-[#A5A09A]">{description}</p>
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
