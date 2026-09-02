import Link from "next/link";

interface AureliusLogoProps {
  compact?: boolean;
  inverse?: boolean;
  className?: string;
}

/**
 * The Arch A: Roman arch negative space + one watch-hand cross stroke.
 * Inline SVG keeps the mark crisp and themeable at every size.
 */
export function AureliusLogo({ compact = false, inverse = true, className = "" }: AureliusLogoProps) {
  const color = inverse ? "text-gold" : "text-bone";

  return (
    <Link
      href="/"
      aria-label="AURELIUS home"
      className={`group inline-flex min-h-11 items-center gap-3 ${color} ${className}`}
    >
      <svg
        aria-hidden="true"
        viewBox="0 0 48 48"
        className="h-8 w-8 shrink-0 overflow-visible"
        fill="none"
      >
        <path
          d="M7 40 21.3 8.8c1.05-2.3 4.35-2.3 5.4 0L41 40"
          stroke="currentColor"
          strokeWidth="2.25"
          strokeLinecap="square"
        />
        <path
          d="M16.5 40V28.5c0-5.1 3.35-8.5 7.5-8.5s7.5 3.4 7.5 8.5V40"
          stroke="currentColor"
          strokeWidth="1.35"
          opacity=".66"
        />
        <path d="M13 29.5h22" stroke="currentColor" strokeWidth="1.25" />
        <circle cx="24" cy="29.5" r="1.5" fill="currentColor" />
      </svg>
      {!compact && (
        <span className="flex flex-col leading-none">
          <span className="font-display text-[17px] font-medium tracking-[0.22em]">AURELIUS</span>
          <span className="mt-1 text-[8px] font-medium uppercase tracking-[0.18em] opacity-60">
            The Empire of Time
          </span>
        </span>
      )}
    </Link>
  );
}
