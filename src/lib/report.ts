import { averageBy, type ScoreGroup } from '@/lib/insights';
import type { AromaGroup, Category, Serve } from '@/lib/types';

/** 연간 리포트에 필요한 시음 필드 */
export interface ReportTasting {
  id: string;
  whisky_id: string;
  tasted_at: string;
  score: number | null;
  serve: Serve | null;
  price_paid: number | null;
  flight_id: string | null;
  whiskies: { name: string; category: Category } | null;
  tasting_aromas: { tag_id: number; aroma_tags: { name: string; grp: AromaGroup } | null }[];
}

export interface ReportBottle {
  purchase_date: string;
  purchase_price: number | null;
}

export interface WhiskyHighlight {
  whisky_id: string;
  name: string;
  score: number;
  tasted_at: string;
}

export interface YearReport {
  year: number;
  tastingCount: number;
  whiskyCount: number;
  avgScore: number | null;
  /** 위스키별 최고점 상위 (같은 점수면 최근 시음 우선) */
  top: WhiskyHighlight[];
  mostTasted: { whisky_id: string; name: string; count: number } | null;
  /** 올해 처음 마신 위스키 */
  newWhiskies: { whisky_id: string; name: string }[];
  topAromas: { name: string; count: number }[];
  aromaGroups: Map<AromaGroup, number>;
  byCategory: ScoreGroup<Category>[];
  byServe: ScoreGroup<Serve>[];
  /** 1–12월 시음 횟수 */
  monthly: number[];
  bottleSpend: number;
  barSpend: number;
  bottlesBought: number;
  bottlesOpened: number;
  flightCount: number;
}

/**
 * 한 해의 시음·구매 기록을 요약한다.
 * tastings·bought는 이미 그 해로 걸러진 시음·구매, openedCount는 그 해에 개봉한 보틀 수,
 * priorWhiskyIds는 그 해 이전에 마신 적 있는 위스키.
 */
export function buildYearReport(
  year: number,
  tastings: ReportTasting[],
  bought: ReportBottle[],
  openedCount: number,
  priorWhiskyIds: Set<string>
): YearReport {
  const scores = tastings.map((t) => t.score).filter((s): s is number => s != null);

  const best = new Map<string, WhiskyHighlight>();
  const counts = new Map<string, { name: string; count: number }>();
  const firstSeen = new Map<string, { name: string; tasted_at: string }>();
  for (const t of tastings) {
    const name = t.whiskies?.name ?? '';
    const c = counts.get(t.whisky_id) ?? { name, count: 0 };
    c.count += 1;
    counts.set(t.whisky_id, c);
    if (!firstSeen.has(t.whisky_id) || t.tasted_at < firstSeen.get(t.whisky_id)!.tasted_at) {
      firstSeen.set(t.whisky_id, { name, tasted_at: t.tasted_at });
    }
    if (t.score == null) continue;
    const prev = best.get(t.whisky_id);
    if (!prev || t.score > prev.score || (t.score === prev.score && t.tasted_at > prev.tasted_at)) {
      best.set(t.whisky_id, {
        whisky_id: t.whisky_id,
        name,
        score: t.score,
        tasted_at: t.tasted_at,
      });
    }
  }
  const top = [...best.values()]
    .sort((a, b) => b.score - a.score || b.tasted_at.localeCompare(a.tasted_at))
    .slice(0, 5);
  const [mostId, most] = [...counts.entries()].sort((a, b) => b[1].count - a[1].count)[0] ?? [];

  // 같은 노트에서 여러 단계에 고른 태그는 한 번만
  const aromaCounts = new Map<string, number>();
  const aromaGroups = new Map<AromaGroup, number>();
  for (const t of tastings) {
    const seen = new Set<number>();
    for (const row of t.tasting_aromas) {
      if (!row.aroma_tags || seen.has(row.tag_id)) continue;
      seen.add(row.tag_id);
      aromaCounts.set(row.aroma_tags.name, (aromaCounts.get(row.aroma_tags.name) ?? 0) + 1);
      aromaGroups.set(row.aroma_tags.grp, (aromaGroups.get(row.aroma_tags.grp) ?? 0) + 1);
    }
  }

  const monthly = new Array<number>(12).fill(0);
  for (const t of tastings) monthly[Number(t.tasted_at.slice(5, 7)) - 1] += 1;

  return {
    year,
    tastingCount: tastings.length,
    whiskyCount: counts.size,
    avgScore: scores.length ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : null,
    top,
    mostTasted: most && most.count > 1 ? { whisky_id: mostId!, ...most } : null,
    newWhiskies: [...firstSeen.entries()]
      .filter(([id]) => !priorWhiskyIds.has(id))
      .sort((a, b) => a[1].tasted_at.localeCompare(b[1].tasted_at))
      .map(([whisky_id, { name }]) => ({ whisky_id, name })),
    topAromas: [...aromaCounts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([name, count]) => ({ name, count })),
    aromaGroups,
    byCategory: averageBy(
      tastings,
      (t) => t.whiskies?.category,
      (t) => t.score
    ),
    byServe: averageBy(
      tastings,
      (t) => t.serve,
      (t) => t.score
    ),
    monthly,
    bottleSpend: bought.reduce((sum, b) => sum + (b.purchase_price ?? 0), 0),
    barSpend: tastings.reduce((sum, t) => sum + (t.price_paid ?? 0), 0),
    bottlesBought: bought.length,
    bottlesOpened: openedCount,
    flightCount: new Set(tastings.map((t) => t.flight_id).filter(Boolean)).size,
  };
}
