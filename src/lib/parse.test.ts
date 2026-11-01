import { describe, expect, it } from 'vitest';
import { parseTastingFields, parseWhiskyFields } from './parse';

function form(entries: Record<string, string | string[]>): FormData {
  const fd = new FormData();
  for (const [key, value] of Object.entries(entries)) {
    for (const v of Array.isArray(value) ? value : [value]) fd.append(key, v);
  }
  return fd;
}

describe('parseTastingFields', () => {
  it('폼 값을 tastings 컬럼 값으로 변환한다', () => {
    const parsed = parseTastingFields(
      form({
        tasted_at: '2026-11-01',
        bottle_id: 'b1',
        location: '  집 ',
        nose_score: '86.4',
        palate_score: '90',
        finish_score: '',
        overall_score: '',
        palate_note: '바닐라',
        would_buy_again: 'yes',
        price_paid: '25000',
        color: '#D49A32',
        serve: 'rocks',
        nose_intensity: 'strong',
        palate_body: 'full',
        palate_sweetness: 'sweet',
        palate_texture: ['oily', 'creamy', 'oily'],
        finish_length: 'long',
        finish_character: ['dry', 'warm'],
        aroma_nose: ['3', '7'],
        aroma_finish: ['7'],
        aroma_overall: ['12'],
      })
    );
    if ('error' in parsed) throw new Error(parsed.error);
    expect(parsed.fields).toMatchObject({
      tasted_at: '2026-11-01',
      bottle_id: 'b1',
      location: '집',
      nose_score: 86,
      palate_score: 90,
      finish_score: null,
      overall_score: null,
      nose_note: null,
      palate_note: '바닐라',
      would_buy_again: 'yes',
      price_paid: 25000,
      color: '#D49A32',
      photo_url: null,
      serve: 'rocks',
      nose_intensity: 'strong',
      palate_body: 'full',
      palate_sweetness: 'sweet',
      palate_texture: ['oily', 'creamy'],
      finish_length: 'long',
      finish_character: ['dry', 'warm'],
    });
    expect(parsed.aromas).toEqual([
      { stage: 'nose', tag_id: 3 },
      { stage: 'nose', tag_id: 7 },
      { stage: 'finish', tag_id: 7 },
      { stage: 'overall', tag_id: 12 },
    ]);
  });

  it('점수가 0–100 밖이면 에러', () => {
    expect(parseTastingFields(form({ tasted_at: '2026-11-01', nose_score: '101' }))).toEqual({
      error: '점수는 0에서 100 사이여야 합니다.',
    });
    expect(parseTastingFields(form({ tasted_at: '2026-11-01', overall_score: '-1' }))).toHaveProperty(
      'error'
    );
  });

  it('시음일이 없으면 에러', () => {
    expect(parseTastingFields(form({ tasted_at: '  ' }))).toEqual({
      error: '시음일을 입력해주세요.',
    });
  });

  it('허용되지 않은 선택값·컬러·태그 id는 버린다', () => {
    const parsed = parseTastingFields(
      form({
        tasted_at: '2026-11-01',
        would_buy_again: 'definitely',
        color: 'rgb(0,0,0)',
        nose_intensity: 'toString',
        serve: 'shot',
        palate_body: 'heavy',
        palate_sweetness: 'hasOwnProperty',
        palate_texture: ['oily', 'gritty'],
        finish_length: '',
        aroma_palate: ['1', 'x', '2.5'],
        aroma_tags: ['5'],
      })
    );
    if ('error' in parsed) throw new Error(parsed.error);
    expect(parsed.fields).toMatchObject({
      would_buy_again: null,
      color: null,
      serve: null,
      nose_intensity: null,
      palate_body: null,
      palate_sweetness: null,
      palate_texture: ['oily'],
      finish_length: null,
      finish_character: [],
    });
    expect(parsed.aromas).toEqual([{ stage: 'palate', tag_id: 1 }]);
  });

  it('서술 노트 필드가 없으면 null (새 폼은 서술 노트를 보내지 않는다)', () => {
    const parsed = parseTastingFields(form({ tasted_at: '2026-11-01', comment: '좋았다' }));
    if ('error' in parsed) throw new Error(parsed.error);
    expect(parsed.fields).toMatchObject({
      nose_note: null,
      palate_note: null,
      finish_note: null,
      comment: '좋았다',
    });
  });

  it('초기 버전의 컬러 key 저장값을 그대로 받는다', () => {
    const parsed = parseTastingFields(form({ tasted_at: '2026-11-01', color: 'amber' }));
    if ('error' in parsed) throw new Error(parsed.error);
    expect(parsed.fields.color).toBe('amber');
  });
});

describe('parseWhiskyFields', () => {
  it('이름과 분류가 있으면 필드를 반환한다', () => {
    const parsed = parseWhiskyFields(
      form({ name: ' 라프로익 10 ', category: 'single_malt', abv: '40', age_years: '10' })
    );
    if ('error' in parsed) throw new Error(parsed.error);
    expect(parsed.fields).toMatchObject({
      name: '라프로익 10',
      category: 'single_malt',
      abv: 40,
      age_years: 10,
      distillery: null,
    });
  });

  it('이름이 없거나 분류가 잘못되면 에러', () => {
    expect(parseWhiskyFields(form({ name: '', category: 'single_malt' }))).toHaveProperty('error');
    expect(parseWhiskyFields(form({ name: '라프로익', category: 'vodka' }))).toHaveProperty('error');
  });

  it('prefix가 붙은 필드명을 읽는다', () => {
    const parsed = parseWhiskyFields(form({ w_name: '야마자키', w_category: 'japanese' }), 'w_');
    expect(parsed).not.toHaveProperty('error');
  });
});
