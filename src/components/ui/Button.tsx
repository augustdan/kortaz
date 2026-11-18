import React from 'react';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'outline';
export type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  icon?: React.ReactNode;
}

const VARIANT_CLASSES: Record<ButtonVariant, string> = {
  primary:
    'bg-[#D99A4E] text-[#090909] font-semibold hover:bg-[#F2B968] shadow-[0_8px_24px_-8px_rgba(217,154,78,0.45)] border border-transparent',
  secondary:
    'bg-[#1B1B1B] text-[#F5F1EB] font-medium hover:bg-[#242220] border border-[#292521]',
  outline:
    'bg-transparent text-[#F5F1EB] font-medium hover:border-[#D99A4E]/60 hover:bg-[#151515] border border-[#292521]',
  ghost:
    'bg-transparent text-[#A5A09A] font-medium hover:text-[#F5F1EB] hover:bg-[#1B1B1B] border border-transparent',
  danger:
    'bg-[#EF5350]/15 text-[#EF5350] font-semibold hover:bg-[#EF5350]/25 border border-[#EF5350]/35',
};

const SIZE_CLASSES: Record<ButtonSize, string> = {
  sm: 'h-8 px-3 text-xs rounded-lg gap-1.5',
  md: 'h-10 px-4 text-sm rounded-xl gap-2',
  lg: 'h-12 px-6 text-sm rounded-xl gap-2.5',
};

export function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  icon,
  children,
  className,
  disabled,
  ...props
}: ButtonProps) {
  return (
    <button
      disabled={disabled || loading}
      className={cn(
        'inline-flex items-center justify-center transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D99A4E]/60 disabled:pointer-events-none disabled:opacity-50 cursor-pointer',
        VARIANT_CLASSES[variant],
        SIZE_CLASSES[size],
        className
      )}
      {...props}
    >
      {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : icon}
      {children}
    </button>
  );
}
