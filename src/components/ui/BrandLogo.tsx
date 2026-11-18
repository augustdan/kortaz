import Link from 'next/link';

export function BrandLogo({
  subtitle,
  title = 'KOR',
  accent = 'TAZ',
  href = '/',
  compact = false,
}: {
  subtitle?: string;
  title?: string;
  accent?: string;
  href?: string;
  compact?: boolean;
}) {
  return (
    <Link href={href} className="inline-flex items-center gap-3 group">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[#292521] bg-[#151515] shadow-[inset_0_1px_0_rgba(245,241,235,0.06)] transition-colors group-hover:border-[#D99A4E]/60">
        <svg
          viewBox="0 0 48 48"
          fill="none"
          className="h-5 w-5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M14 11V37" stroke="#D99A4E" strokeWidth="4.2" />
          <path d="M34 11L19 24L35 37" stroke="#F2B968" strokeWidth="4.2" />
        </svg>
      </div>
      {!compact && (
        <div className="flex flex-col leading-none">
          <span className="font-display text-lg font-extrabold tracking-[0.14em] text-[#F5F1EB]">
            {title}
            <span className="text-[#D99A4E]">{accent}</span>
          </span>
          {subtitle && (
            <span className="mt-0.5 max-w-[155px] truncate text-[10px] font-medium uppercase tracking-[0.16em] text-[#A5A09A]">
              {subtitle}
            </span>
          )}
        </div>
      )}
    </Link>
  );
}
