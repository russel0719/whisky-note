import Link from 'next/link';
import { CATEGORY_LABELS, type Category } from '@/lib/types';

export function SectionTitle({ children }: { children: React.ReactNode }) {
  return <h2 className="text-[21px] font-semibold mb-4">{children}</h2>;
}

export function Card({
  children,
  className = '',
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`bg-tile-1 border border-hairline rounded-(--radius-card) p-5 ${className}`}>
      {children}
    </div>
  );
}

export function EmptyState({
  message,
  ctaHref,
  ctaLabel,
}: {
  message: string;
  ctaHref?: string;
  ctaLabel?: string;
}) {
  return (
    <div className="bg-tile-1 border border-hairline rounded-(--radius-card) py-12 px-6 text-center">
      <p className="text-muted">{message}</p>
      {ctaHref && ctaLabel && (
        <Link
          href={ctaHref}
          className="inline-flex items-center mt-5 h-10 px-5 rounded-full bg-accent text-on-accent text-sm font-semibold"
        >
          {ctaLabel}
        </Link>
      )}
    </div>
  );
}

export function CategoryBadge({ category }: { category: Category }) {
  return (
    <span className="inline-flex items-center h-6 px-2.5 rounded-full border border-hairline text-xs text-muted">
      {CATEGORY_LABELS[category]}
    </span>
  );
}

/** 100점제 점수 표시. null이면 렌더링하지 않는다. */
export function Score({ value, label }: { value: number | null; label?: string }) {
  if (value == null) return null;
  return (
    <span className="inline-flex items-baseline gap-1">
      {label && <span className="text-xs text-faint">{label}</span>}
      <span className="font-semibold text-accent-bright tabular-nums">{value}</span>
    </span>
  );
}

/** 보틀 잔량 게이지 */
export function RemainingBar({ pct }: { pct: number }) {
  return (
    <div className="h-1.5 rounded-full bg-tile-2 overflow-hidden">
      <div
        className="h-full rounded-full bg-accent"
        style={{ width: `${Math.max(0, Math.min(100, pct))}%` }}
      />
    </div>
  );
}
