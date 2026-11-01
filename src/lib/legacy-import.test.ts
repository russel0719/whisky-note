import { describe, expect, it } from 'vitest';
import {
  DEFAULT_MAPPING,
  applyMapping,
  fitScoreMapping,
  matchLevel,
  normalizeWhiskyName,
  parseLegacyReview,
} from './legacy-import';

const SAMPLE = `위스키 후기
- 가장 처음 마셔본 에반 윌리엄스를 기준(5점)으로 설정
- 구매해서 마신 것은 괄호로 가격 표시

피트/스모키
조니워커 블랙라벨(4.48)	7
라가불린 DE(10.9)	7.5
아드벡 스모키버스	7.3

스파이시/오크
에반 윌리엄스(3.7)	5
와일드터키 101 8Y	6.3
발베니 21Y 포트우드	9
`;

describe('parseLegacyReview', () => {
  const rows = parseLegacyReview(SAMPLE);

  it('설명 줄은 건너뛰고 섹션·이름·가격·점수를 읽는다', () => {
    expect(rows).toHaveLength(6);
    expect(rows[0]).toEqual({
      index: 0,
      section: '피트/스모키',
      name: '조니워커 블랙라벨',
      searchName: '조니워커 블랙라벨',
      price: 44800,
      sourceScore: 7,
    });
  });

  it('가격 괄호가 없으면 시음만 (price null)', () => {
    expect(rows[2]).toMatchObject({ name: '아드벡 스모키버스', price: null, sourceScore: 7.3 });
  });

  it('섹션이 바뀌면 다음 줄부터 적용', () => {
    expect(rows[3]).toMatchObject({
      section: '스파이시/오크',
      name: '에반 윌리엄스',
      price: 37000,
    });
  });

  it('이름 안의 숫자(8Y, 101)와 점수를 헷갈리지 않는다', () => {
    expect(rows[4]).toMatchObject({
      name: '와일드터키 101 8Y',
      searchName: '와일드터키 101 8년',
      sourceScore: 6.3,
    });
    expect(rows[5]).toMatchObject({ name: '발베니 21Y 포트우드', sourceScore: 9 });
  });

  it('공백 하나로 구분해도 읽는다', () => {
    expect(parseLegacyReview('글렌피딕 12Y(7.9) 6.5')[0]).toMatchObject({
      name: '글렌피딕 12Y',
      price: 79000,
      sourceScore: 6.5,
    });
  });
});

describe('normalizeWhiskyName', () => {
  it('Y 표기와 DE 약어를 카탈로그 표기로', () => {
    expect(normalizeWhiskyName('라가불린 16Y')).toBe('라가불린 16년');
    expect(normalizeWhiskyName('라가불린 DE')).toBe('라가불린 디스틸러스 에디션');
    expect(normalizeWhiskyName('발베니 12Y 더블우드')).toBe('발베니 12년 더블우드');
  });
});

describe('matchLevel', () => {
  const entry = (name_ko: string, distillery: string | null = null) => ({
    name: 'x',
    name_ko,
    distillery,
  });
  it('띄어쓰기가 달라도 모든 단어가 있으면 exact', () => {
    expect(matchLevel('조니워커 블랙라벨', entry('조니워커 블랙 라벨'))).toBe('exact');
  });
  it('3단어 이상에서 하나만 빠지면 near', () => {
    expect(matchLevel('글렌피딕 12년 셰리', entry('글렌피딕 12년'))).toBe('near');
  });
  it('그보다 적게 맞으면 weak', () => {
    expect(matchLevel('아드벡 스모키버스', entry('아드벡 10년'))).toBe('weak');
    expect(
      matchLevel('카발란 콘서트마스터 셰리캐스크 피니시', entry('카발란 솔리스트 럼 캐스크 피니시'))
    ).toBe('weak');
  });
});

describe('fitScoreMapping', () => {
  it('겹치는 기록이 없으면 기본식 (5 → 70, 1점당 6)', () => {
    const m = fitScoreMapping([]);
    expect(m).toEqual(DEFAULT_MAPPING);
    expect(applyMapping(m, 5)).toBe(70);
    expect(applyMapping(m, 7.5)).toBe(85);
  });

  it('1쌍이면 기본 기울기로 그 점을 지나게', () => {
    const m = fitScoreMapping([{ source: 7.5, score: 88 }]);
    expect(m.method).toBe('shift');
    expect(applyMapping(m, 7.5)).toBe(88);
    expect(applyMapping(m, 6.5)).toBe(82);
  });

  it('2쌍 이상이면 최소제곱 직선', () => {
    const m = fitScoreMapping([
      { source: 5, score: 60 },
      { source: 7, score: 80 },
      { source: 9, score: 100 },
    ]);
    expect(m.method).toBe('fit');
    expect(m.slope).toBeCloseTo(10);
    expect(m.intercept).toBeCloseTo(10);
  });

  it('원점수가 모두 같거나 기울기가 비정상이면 평균점만 맞춘다', () => {
    expect(
      fitScoreMapping([
        { source: 7, score: 80 },
        { source: 7, score: 84 },
      ]).method
    ).toBe('shift');
    const inverted = fitScoreMapping([
      { source: 6, score: 90 },
      { source: 8, score: 70 },
    ]);
    expect(inverted.method).toBe('shift');
    expect(inverted.slope).toBe(6);
  });

  it('환산 결과는 0–100으로 자른다', () => {
    expect(applyMapping({ slope: 20, intercept: 0 }, 9)).toBe(100);
    expect(applyMapping({ slope: 6, intercept: -100 }, 1)).toBe(0);
  });
});
