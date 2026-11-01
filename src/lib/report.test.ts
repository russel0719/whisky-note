import { describe, expect, it } from 'vitest';
import { buildYearReport, type ReportTasting } from './report';

function t(
  partial: Partial<ReportTasting> & { id: string; whisky_id: string; tasted_at: string }
): ReportTasting {
  return {
    score: null,
    serve: null,
    price_paid: null,
    flight_id: null,
    whiskies: { name: partial.whisky_id, category: 'single_malt' },
    tasting_aromas: [],
    ...partial,
  };
}

const smoke = { tag_id: 21, aroma_tags: { name: '스모크', grp: 'peat' as const } };
const honey = { tag_id: 11, aroma_tags: { name: '꿀', grp: 'sweet' as const } };

describe('buildYearReport', () => {
  const tastings = [
    t({
      id: '1',
      whisky_id: 'lag',
      tasted_at: '2026-01-10',
      score: 88,
      serve: 'neat',
      tasting_aromas: [smoke, smoke, honey],
    }),
    t({
      id: '2',
      whisky_id: 'lag',
      tasted_at: '2026-06-01',
      score: 92,
      serve: 'neat',
      tasting_aromas: [smoke],
    }),
    t({
      id: '3',
      whisky_id: 'gf',
      tasted_at: '2026-03-05',
      score: 92,
      serve: 'highball',
      price_paid: 15000,
      flight_id: 'f1',
    }),
    t({ id: '4', whisky_id: 'jw', tasted_at: '2026-03-20', score: null, flight_id: 'f1' }),
  ];
  const report = buildYearReport(
    2026,
    tastings,
    [
      { purchase_date: '2026-02-01', purchase_price: 100000 },
      { purchase_date: '2026-05-01', purchase_price: null },
    ],
    3,
    new Set(['gf'])
  );

  it('기본 집계', () => {
    expect(report).toMatchObject({
      tastingCount: 4,
      whiskyCount: 3,
      avgScore: 91,
      bottleSpend: 100000,
      barSpend: 15000,
      bottlesBought: 2,
      bottlesOpened: 3,
      flightCount: 1,
    });
    expect(report.monthly).toEqual([1, 0, 2, 0, 0, 1, 0, 0, 0, 0, 0, 0]);
  });

  it('위스키별 최고점 순위 — 동점이면 최근 시음이 먼저', () => {
    expect(report.top.map((h) => [h.whisky_id, h.score])).toEqual([
      ['lag', 92],
      ['gf', 92],
    ]);
  });

  it('가장 자주 마신 위스키는 2회 이상일 때만', () => {
    expect(report.mostTasted).toEqual({ whisky_id: 'lag', name: 'lag', count: 2 });
  });

  it('이전에 마신 적 없는 위스키만 새로 만난 위스키', () => {
    expect(report.newWhiskies.map((w) => w.whisky_id)).toEqual(['lag', 'jw']);
  });

  it('아로마는 노트당 태그 1회', () => {
    expect(report.topAromas).toEqual([
      { name: '스모크', count: 2 },
      { name: '꿀', count: 1 },
    ]);
    expect(report.aromaGroups.get('peat')).toBe(2);
  });
});
