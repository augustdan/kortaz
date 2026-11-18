import Link from 'next/link';

export function BrandLogo({
  subtitle = 'BARBEARIA & SALÃO OS',
  title = 'KOR',
  accent = 'TAZ',
  href = '/',
}: {
  subtitle?: string;
  title?: string;
  accent?: string;
  href?: string;
}) {
  return (
    <Link href={href} className="inline-flex items-center gap-3 group">
      <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-[#D49B6A]/35 bg-[#1A110C] shadow-[inset_0_1px_0_rgba(247,239,230,0.12)] transition-all group-hover:border-[#D49B6A]">
        <svg
          viewBox="0 0 48 48"
          fill="none"
          className="h-5 w-5"
          stroke="#D49B6A"
          strokeWidth="2.4"
          strokeLinecap="round"
        >
          <path d="M24 8V40" />
          <path d="M8 24H40" />
          <path d="M13 13L35 35" />
          <path d="M35 13L13 35" />
          <circle cx="24" cy="24" r="3.2" fill="#F7EFE6" stroke="none" />
        </svg>
      </div>
      <div className="flex flex-col leading-none">
        <span className="text-[9px] font-semibold uppercase tracking-[0.26em] text-[#D49B6A]">
          {subtitle}
        </span>
        <span className="mt-0.5 font-serif text-xl font-semibold tracking-wider text-[#F7EFE6]">
          {title}
          <span className="text-[#D49B6A]">{accent}</span>
        </span>
      </div>
    </Link>
  );
}
