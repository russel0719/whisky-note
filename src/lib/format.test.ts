import { describe, expect, it } from 'vitest';
import {
  averageScore,
  daysSinceOpen,
  formatDate,
  formatKrw,
  formatOpenAge,
  tastingDescriptors,
} from './format';

describe('averageScore', () => {
  it('입력된 점수만으로 반올림 평균을 낸다', () => {
    expect(averageScore(80, 85, 90)).toBe(85);
    expect(averageScore(80, null, 85)).toBe(83);
    expect(averageScore(undefined, 91)).toBe(91);
  });

  it('점수가 하나도 없으면 null', () => {
    expect(averageScore()).toBeNull();
    expect(averageScore(null, undefined, null)).toBeNull();
  });

  it('0점도 유효한 점수로 센다', () => {
    expect(averageScore(0, 100)).toBe(50);
  });
});

describe('daysSinceOpen', () => {
  it('개봉일과 기준일의 차이를 일 단위로 계산한다', () => {
    expect(daysSinceOpen('2026-01-01', '2026-01-01')).toBe(0);
    expect(daysSinceOpen('2026-01-01', '2026-03-01')).toBe(59);
  });

  it('시각이 붙은 값은 날짜 부분만 쓴다', () => {
    expect(daysSinceOpen('2026-01-01T23:59:00Z', '2026-01-02T00:00:00Z')).toBe(1);
  });

  it('개봉일이 없거나 기준일보다 미래면 null', () => {
    expect(daysSinceOpen(null, '2026-01-01')).toBeNull();
    expect(daysSinceOpen('2026-02-01', '2026-01-01')).toBeNull();
  });
});

describe('formatOpenAge', () => {
  it.each([
    ['2026-01-01', '개봉 당일'],
    ['2026-01-11', '개봉 10일차'],
    ['2026-02-15', '개봉 1개월차'],
    ['2026-03-01', '개봉 2개월차'],
    ['2027-01-01', '개봉 1년차'],
    ['2027-04-01', '개봉 1년 3개월차'],
    ['2027-03-31', '개봉 1년 2개월차'],
  ])('%s 기준 → %s', (at, expected) => {
    expect(formatOpenAge('2026-01-01', at)).toBe(expected);
  });

  it('개봉일이 없으면 null', () => {
    expect(formatOpenAge(null)).toBeNull();
  });
});

describe('formatDate / formatKrw', () => {
  it('날짜를 한국식 표기로 바꾼다', () => {
    expect(formatDate('2026-07-09')).toBe('2026. 7. 9.');
    expect(formatDate(null)).toBe('—');
  });

  it('금액에 원 기호와 천 단위 구분을 붙인다', () => {
    expect(formatKrw(125000)).toBe('₩125,000');
    expect(formatKrw(0)).toBe('₩0');
    expect(formatKrw(null)).toBe('—');
  });
});

describe('tastingDescriptors', () => {
  const empty = {
    serve: null,
    nose_intensity: null,
    palate_body: null,
    palate_sweetness: null,
    palate_texture: [],
    finish_length: null,
    finish_character: [],
  };

  it('선택한 항목을 단계 순서대로 이어 붙인다', () => {
    expect(
      tastingDescriptors({
        serve: 'water',
        nose_intensity: 'strong',
        palate_body: 'full',
        palate_sweetness: 'dry',
        palate_texture: ['oily', 'creamy'],
        finish_length: 'long',
        finish_character: ['dry'],
      })
    ).toBe('가수 · 향 강렬함 · 풀 바디 · 맛 드라이 · 오일리 · 크리미 · 여운 긺 · 드라이');
  });

  it('고른 게 없으면 null', () => {
    expect(tastingDescriptors(empty)).toBeNull();
  });
});
