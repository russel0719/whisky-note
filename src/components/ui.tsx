import Link from 'next/link';
import { CATEGORY_LABELS, type Category } from '@/lib/types';

/** 점수 밴드 — 점수가 보이는 모든 곳에서 동일 규칙 적용 (90+ 골드 / 80+ 앰버 / 70+ 크림 / 이하 muted) */
export function scoreTextClass(score: number | null | undefined): string {
  if (score == null) return 'text-muted';
  if (score >= 90) return 'text-score-gold';
  if (score >= 80) return 'text-accent-bright';
  if (score >= 70) return 'text-ink';
  return 'text-muted';
}

export function Eyebrow({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-accent text-[13px] tracking-[0.25em] uppercase mb-2">{children}</p>
  );
}

export function PageHeader({
  eyebrow,
  title,
  action,
}: {
  eyebrow: string;
  title: string;
  action?: React.ReactNode;
}) {
  return (
    <header className="flex items-end justify-between mb-6">
      <div>
        <Eyebrow>{eyebrow}</Eyebrow>
        <h1 className="font-display text-[30px] md:text-[36px] leading-tight">{title}</h1>
      </div>
      {action}
    </header>
  );
}

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
    <div
      className={`bg-tile-1 border border-hairline rounded-(--radius-card) p-5 transition-colors ${className}`}
    >
      {children}
    </div>
  );
}

/** Link로 감싸는 카드 — hover 시 hairline이 앰버로 은은히 전환 */
export function LinkCard({
  href,
  children,
  className = '',
}: {
  href: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <Link href={href} className="block group">
      <Card className={`group-hover:border-accent/30 ${className}`}>{children}</Card>
    </Link>
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
      <GlencairnArt className="w-10 h-10 mx-auto mb-4 text-faint" />
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

/** 빈 상태용 글렌캐런 라인아트 */
export function GlencairnArt({ className = '' }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 48 48"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinejoin="round"
      strokeLinecap="round"
      className={className}
      aria-hidden
    >
      <path d="M16 6c0 9 2.4 13.4 4.6 16.4 1.2 1.6 1.6 3 1.6 5.2h3.6c0-2.2.4-3.6 1.6-5.2C29.6 19.4 32 15 32 6H16Z" />
      <path d="M22.8 27.6v3.6M25.2 27.6v3.6" />
      <path d="M17 34.8h14" opacity="0.7" />
      <path d="M19 12.5c1 4.5 2.5 7 4 9" className="text-accent" stroke="currentColor" opacity="0.55" />
    </svg>
  );
}

export function CategoryBadge({ category }: { category: Category }) {
  return (
    <span className="inline-flex items-center h-6 px-2.5 rounded-full border border-hairline text-xs text-muted">
      {CATEGORY_LABELS[category]}
    </span>
  );
}

/** 리스트 카드 우측의 점수 — 세리프 + 점수 밴드 */
export function ScoreFigure({
  value,
  size = 'md',
}: {
  value: number | null;
  size?: 'md' | 'lg';
}) {
  return (
    <p
      className={`font-display tabular-nums shrink-0 ${
        size === 'lg' ? 'text-[40px] leading-none' : 'text-[24px]'
      } ${scoreTextClass(value)}`}
    >
      {value ?? '—'}
    </p>
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

/* ---------------------------------------------------------------------------
 * 스켈레톤 — (app)/loading.tsx 에서 사용. 실제 카드 리스트 골격과 동일한 형태.
 * ------------------------------------------------------------------------- */
export function SkeletonList({ rows = 4 }: { rows?: number }) {
  return (
    <div aria-busy className="space-y-8">
      <div>
        <div className="skeleton h-3 w-24 mb-3" />
        <div className="skeleton h-9 w-48" />
      </div>
      <div className="space-y-3">
        {Array.from({ length: rows }).map((_, i) => (
          <div
            key={i}
            className="bg-tile-1 border border-hairline rounded-(--radius-card) p-5"
          >
            <div className="skeleton h-5 w-2/5 mb-3" />
            <div className="skeleton h-4 w-3/5" />
          </div>
        ))}
      </div>
    </div>
  );
}
