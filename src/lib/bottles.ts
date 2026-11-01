import { daysSinceOpen } from '@/lib/format';
import type { Bottle } from '@/lib/types';

function localIso(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export interface Depletion {
  /** 지금까지의 평균 속도로 다 마시기까지 남은 일수 */
  daysLeft: number;
  /** 예상 소진일 (YYYY-MM-DD) */
  date: string;
  /** 주당 평균 소비량 (ml) */
  mlPerWeek: number;
  /** 개봉 후 1년 넘게 걸릴 속도 — 산화가 걱정되는 경우 */
  slow: boolean;
}

/**
 * 개봉 보틀의 소진 예측. 개봉일부터 지금까지 줄어든 잔량(잔량 슬라이더·따른 양 모두 반영)의
 * 평균 속도로 남은 양을 나눈다. 개봉일이 없거나 아직 줄어든 게 없으면 null.
 */
export function predictDepletion(
  bottle: Pick<Bottle, 'open_date' | 'size_ml' | 'remaining_pct' | 'status'>,
  today: Date = new Date()
): Depletion | null {
  if (bottle.status !== 'open' || !bottle.open_date || bottle.remaining_pct <= 0) return null;
  const todayIso = localIso(today);
  const daysOpen = Math.max(1, daysSinceOpen(bottle.open_date, todayIso) ?? 0);
  const consumed = (bottle.size_ml * (100 - bottle.remaining_pct)) / 100;
  if (consumed <= 0) return null;

  const perDay = consumed / daysOpen;
  const remaining = (bottle.size_ml * bottle.remaining_pct) / 100;
  const daysLeft = Math.ceil(remaining / perDay);
  const date = localIso(
    new Date(today.getFullYear(), today.getMonth(), today.getDate() + daysLeft)
  );
  return {
    daysLeft,
    date,
    mlPerWeek: Math.round(perDay * 7),
    slow: daysOpen + daysLeft > 365,
  };
}

/** "약 3주", "약 4개월" 같은 대략적인 기간 표기 */
export function formatDuration(days: number): string {
  if (days < 14) return `${days}일`;
  if (days < 60) return `약 ${Math.round(days / 7)}주`;
  if (days < 730) return `약 ${Math.round(days / 30.44)}개월`;
  return `약 ${Math.round(days / 365)}년`;
}

/**
 * 같은 보틀의 점수가 개봉 후 떨어지고 있는지 — 처음 두 번의 평균보다 최근 점수가 3점 이상 낮으면 하락.
 * points는 시음일 오름차순, 점수가 있는 시음만.
 */
export function scoreDecline(points: { score: number }[]): number | null {
  if (points.length < 3) return null;
  const early = (points[0].score + points[1].score) / 2;
  const drop = Math.round(early - points[points.length - 1].score);
  return drop >= 3 ? drop : null;
}

export interface PricePoint {
  purchase_date: string;
  purchase_price: number | null;
  purchase_place: string | null;
}

export interface PriceSummary {
  count: number;
  min: number;
  max: number;
  last: PricePoint & { purchase_price: number };
  /** 직전 구매 대비 최근 구매가 차이 (구매 1번이면 null) */
  change: number | null;
}

/** 같은 위스키의 구매가 요약 — 가격이 있는 구매만 */
export function priceSummary(purchases: PricePoint[]): PriceSummary | null {
  const priced = purchases
    .filter((p): p is PricePoint & { purchase_price: number } => p.purchase_price != null)
    .sort((a, b) => a.purchase_date.localeCompare(b.purchase_date));
  if (priced.length === 0) return null;
  const prices = priced.map((p) => p.purchase_price);
  const last = priced[priced.length - 1];
  return {
    count: priced.length,
    min: Math.min(...prices),
    max: Math.max(...prices),
    last,
    change:
      priced.length > 1 ? last.purchase_price - priced[priced.length - 2].purchase_price : null,
  };
}
