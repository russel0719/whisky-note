import type { CatalogEntry, Category } from '@/lib/types';

export interface ScoreGroup<K extends string> {
  key: K;
  avg: number;
  count: number;
}

/** 항목을 key별로 묶어 평균 점수(반올림)와 횟수를 낸다. key나 점수가 없는 항목은 제외. 평균 내림차순 */
export function averageBy<T, K extends string>(
  items: T[],
  keyOf: (item: T) => K | null | undefined,
  scoreOf: (item: T) => number | null | undefined,
  minCount = 1
): ScoreGroup<K>[] {
  const groups = new Map<K, number[]>();
  for (const item of items) {
    const key = keyOf(item);
    const score = scoreOf(item);
    if (key == null || score == null) continue;
    const list = groups.get(key) ?? [];
    list.push(score);
    groups.set(key, list);
  }
  return [...groups.entries()]
    .filter(([, scores]) => scores.length >= minCount)
    .map(([key, scores]) => ({
      key,
      avg: Math.round(scores.reduce((a, b) => a + b, 0) / scores.length),
      count: scores.length,
    }))
    .sort((a, b) => b.avg - a.avg || b.count - a.count);
}

export interface LikedWhisky {
  name: string;
  score: number;
  catalog_id: string | null;
  distillery: string | null;
  region: string | null;
  category: Category;
  cask_type: string | null;
}

export interface Recommendation {
  entry: CatalogEntry;
  reason: string;
}

function same(a: string | null | undefined, b: string | null | undefined): boolean {
  return !!a && !!b && a.trim().toLowerCase() === b.trim().toLowerCase();
}

/** 캐스크 표기는 자유 텍스트라 한쪽이 다른 쪽을 포함하면 같은 계열로 본다 (예: "셰리" ⊂ "올로로소 셰리") */
function similarCask(a: string | null | undefined, b: string | null | undefined): boolean {
  if (!a || !b) return false;
  const x = a.trim().toLowerCase();
  const y = b.trim().toLowerCase();
  return x.includes(y) || y.includes(x);
}

/**
 * 좋아한 위스키(높은 점수)와 증류소·지역·캐스크가 겹치는 카탈로그 항목을 추천한다.
 * 분류만 같은 경우는 근거가 약해 추천하지 않는다(분류는 다른 근거가 있을 때 가산점).
 * excludeCatalogIds — 이미 내 위스키이거나 위시리스트에 있는 항목.
 */
export function recommendFromCatalog(
  liked: LikedWhisky[],
  catalog: CatalogEntry[],
  excludeCatalogIds: Set<string>,
  limit = 6
): Recommendation[] {
  const exclude = new Set(excludeCatalogIds);
  for (const w of liked) if (w.catalog_id) exclude.add(w.catalog_id);
  const likedNames = new Set(liked.map((w) => w.name.trim().toLowerCase()));

  const scored: { entry: CatalogEntry; weight: number; reason: string }[] = [];
  for (const entry of catalog) {
    if (exclude.has(entry.id)) continue;
    if (likedNames.has((entry.name_ko ?? entry.name).trim().toLowerCase())) continue;

    let weight = 0;
    let best = { value: 0, reason: '' };
    for (const w of liked) {
      const factor = Math.max(0.5, (w.score - 80) / 10);
      const parts: [number, string][] = [];
      if (same(entry.distillery, w.distillery)) parts.push([3, '같은 증류소']);
      if (same(entry.region, w.region)) parts.push([1.5, '같은 지역']);
      if (similarCask(entry.cask_type, w.cask_type)) parts.push([1, '비슷한 캐스크']);
      if (parts.length === 0) continue;
      if (entry.category === w.category) parts.push([1, '']);

      const value = parts.reduce((sum, [v]) => sum + v, 0) * factor;
      weight += value;
      if (value > best.value) {
        const labels = parts.map(([, label]) => label).filter(Boolean);
        best = { value, reason: `${w.name} ${w.score}점 → ${labels.join(' · ')}` };
      }
    }
    if (weight > 0) scored.push({ entry, weight, reason: best.reason });
  }

  return scored
    .sort((a, b) => b.weight - a.weight)
    .slice(0, limit)
    .map(({ entry, reason }) => ({ entry, reason }));
}
