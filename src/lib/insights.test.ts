import { describe, expect, it } from 'vitest';
import { averageBy, recommendFromCatalog, type LikedWhisky } from './insights';
import type { CatalogEntry } from './types';

describe('averageBy', () => {
  const rows = [
    { k: 'neat', s: 90 },
    { k: 'neat', s: 85 },
    { k: 'highball', s: 70 },
    { k: null, s: 99 },
    { k: 'water', s: null },
  ];

  it('key별 평균·횟수를 평균 내림차순으로', () => {
    expect(
      averageBy(
        rows,
        (r) => r.k,
        (r) => r.s
      )
    ).toEqual([
      { key: 'neat', avg: 88, count: 2 },
      { key: 'highball', avg: 70, count: 1 },
    ]);
  });

  it('minCount 미만 그룹은 제외', () => {
    expect(
      averageBy(
        rows,
        (r) => r.k,
        (r) => r.s,
        2
      )
    ).toEqual([{ key: 'neat', avg: 88, count: 2 }]);
  });
});

function entry(partial: Partial<CatalogEntry> & { id: string; name: string }): CatalogEntry {
  return {
    name_ko: null,
    distillery: null,
    category: 'single_malt',
    region: null,
    country: null,
    abv: null,
    age_years: null,
    cask_type: null,
    ...partial,
  };
}

describe('recommendFromCatalog', () => {
  const liked: LikedWhisky[] = [
    {
      name: '라가불린 16년',
      score: 92,
      catalog_id: 'c-lag16',
      distillery: 'Lagavulin',
      region: 'Islay',
      category: 'single_malt',
      cask_type: null,
    },
  ];
  const catalog = [
    entry({ id: 'c-lag16', name: 'Lagavulin 16', distillery: 'Lagavulin', region: 'Islay' }),
    entry({ id: 'c-lag8', name: 'Lagavulin 8', distillery: 'Lagavulin', region: 'Islay' }),
    entry({ id: 'c-ard10', name: 'Ardbeg 10', distillery: 'Ardbeg', region: 'Islay' }),
    entry({ id: 'c-gf12', name: 'Glenfiddich 12', distillery: 'Glenfiddich', region: 'Speyside' }),
    entry({ id: 'c-wish', name: 'Laphroaig 10', distillery: 'Laphroaig', region: 'islay' }),
  ];

  it('같은 증류소 > 같은 지역 순으로 추천하고, 이미 가진 항목·근거 없는 항목은 뺀다', () => {
    const recs = recommendFromCatalog(liked, catalog, new Set(['c-wish']));
    expect(recs.map((r) => r.entry.id)).toEqual(['c-lag8', 'c-ard10']);
    expect(recs[0].reason).toBe('라가불린 16년 92점 → 같은 증류소 · 같은 지역');
    expect(recs[1].reason).toBe('라가불린 16년 92점 → 같은 지역');
  });

  it('좋아한 위스키가 없으면 추천 없음', () => {
    expect(recommendFromCatalog([], catalog, new Set())).toEqual([]);
  });

  it('캐스크는 포함 관계면 비슷한 계열로 본다', () => {
    const sherryLover: LikedWhisky[] = [
      { ...liked[0], catalog_id: null, distillery: null, region: null, cask_type: '셰리' },
    ];
    const recs = recommendFromCatalog(
      sherryLover,
      [
        entry({ id: 'x', name: 'X', cask_type: '올로로소 셰리' }),
        entry({ id: 'y', name: 'Y', cask_type: '버번' }),
      ],
      new Set()
    );
    expect(recs.map((r) => r.entry.id)).toEqual(['x']);
  });
});
