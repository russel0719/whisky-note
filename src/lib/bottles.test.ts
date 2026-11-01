import { describe, expect, it } from 'vitest';
import { formatDuration, predictDepletion, priceSummary, scoreDecline } from './bottles';

const today = new Date('2026-11-01T12:00:00Z');

describe('predictDepletion', () => {
  it('지금까지의 평균 속도로 남은 기간을 낸다', () => {
    // 100일 동안 700ml의 50% → 하루 3.5ml, 남은 350ml → 100일
    const p = predictDepletion(
      { status: 'open', open_date: '2026-07-24', size_ml: 700, remaining_pct: 50 },
      today
    );
    expect(p).toEqual({ daysLeft: 100, date: '2027-02-09', mlPerWeek: 25, slow: false });
  });

  it('이 속도면 개봉 1년을 넘기는 경우 slow', () => {
    const p = predictDepletion(
      { status: 'open', open_date: '2026-08-03', size_ml: 700, remaining_pct: 90 },
      today
    );
    expect(p?.slow).toBe(true);
  });

  it('개봉 전·공병·개봉일 없음·아직 안 줄었으면 null', () => {
    const base = { size_ml: 700, open_date: '2026-10-01', remaining_pct: 80 };
    expect(predictDepletion({ ...base, status: 'unopened' }, today)).toBeNull();
    expect(predictDepletion({ ...base, status: 'open', remaining_pct: 0 }, today)).toBeNull();
    expect(predictDepletion({ ...base, status: 'open', open_date: null }, today)).toBeNull();
    expect(predictDepletion({ ...base, status: 'open', remaining_pct: 100 }, today)).toBeNull();
  });
});

describe('formatDuration', () => {
  it.each([
    [5, '5일'],
    [21, '약 3주'],
    [120, '약 4개월'],
    [800, '약 2년'],
  ])('%d일 → %s', (days, text) => {
    expect(formatDuration(days)).toBe(text);
  });
});

describe('scoreDecline', () => {
  it('처음 두 번 평균보다 최근이 3점 이상 낮으면 하락폭', () => {
    expect(scoreDecline([{ score: 90 }, { score: 88 }, { score: 85 }])).toBe(4);
  });
  it('3번 미만이거나 하락이 작으면 null', () => {
    expect(scoreDecline([{ score: 90 }, { score: 80 }])).toBeNull();
    expect(scoreDecline([{ score: 90 }, { score: 88 }, { score: 88 }])).toBeNull();
  });
});

describe('priceSummary', () => {
  it('최저·최고·최근과 직전 대비 변화', () => {
    const s = priceSummary([
      { purchase_date: '2026-05-01', purchase_price: 95000, purchase_place: 'B' },
      { purchase_date: '2025-12-01', purchase_price: 89000, purchase_place: 'A' },
      { purchase_date: '2026-08-01', purchase_price: null, purchase_place: null },
    ]);
    expect(s).toMatchObject({ count: 2, min: 89000, max: 95000, change: 6000 });
    expect(s?.last.purchase_place).toBe('B');
  });
  it('가격 있는 구매가 없으면 null, 1번이면 change null', () => {
    expect(priceSummary([])).toBeNull();
    expect(
      priceSummary([{ purchase_date: '2026-01-01', purchase_price: 50000, purchase_place: null }])
        ?.change
    ).toBeNull();
  });
});
