import {
  CATEGORIES,
  FINISH_CHARACTERS,
  FINISH_LENGTHS,
  HEX_COLOR_RE,
  NOSE_INTENSITIES,
  PALATE_BODIES,
  PALATE_SWEETNESS,
  PALATE_TEXTURES,
  SERVES,
  WHISKY_COLORS,
  type AromaStage,
  type Category,
} from '@/lib/types';

export function parseOptionalNumber(value: FormDataEntryValue | null): number | null {
  const s = String(value ?? '').trim();
  if (!s) return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

export function parseOptionalText(value: FormDataEntryValue | null): string | null {
  const s = String(value ?? '').trim();
  return s || null;
}

export function parseWhiskyFields(formData: FormData, prefix = '') {
  const name = String(formData.get(`${prefix}name`) ?? '').trim();
  const category = String(formData.get(`${prefix}category`) ?? '');
  if (!name) return { error: '위스키 이름을 입력해주세요.' as const };
  if (!CATEGORIES.includes(category as Category)) return { error: '분류를 선택해주세요.' as const };
  return {
    fields: {
      name,
      category,
      distillery: parseOptionalText(formData.get(`${prefix}distillery`)),
      region: parseOptionalText(formData.get(`${prefix}region`)),
      abv: parseOptionalNumber(formData.get(`${prefix}abv`)),
      age_years: parseOptionalNumber(formData.get(`${prefix}age_years`)),
      cask_type: parseOptionalText(formData.get(`${prefix}cask_type`)),
    },
  };
}

function parseScore(value: FormDataEntryValue | null): number | null | 'invalid' {
  const n = parseOptionalNumber(value);
  if (n == null) return null;
  if (n < 0 || n > 100) return 'invalid';
  return Math.round(n);
}

/** 단일 선택값 — 허용 키가 아니면 null */
function parseChoice<T extends string>(
  value: FormDataEntryValue | null,
  options: Record<T, string>
): T | null {
  const s = String(value ?? '');
  return Object.hasOwn(options, s) ? (s as T) : null;
}

/** 복수 선택값 — 허용 키만 중복 없이 */
function parseChoices<T extends string>(
  values: FormDataEntryValue[],
  options: Record<T, string>
): T[] {
  return [...new Set(values.map(String))].filter((s): s is T => Object.hasOwn(options, s));
}

/** 아로마 태그 체크박스 필드명 (aroma_nose 등). overall은 단계 구분 이전 태그를 보존하는 용도 */
export const AROMA_FIELD_STAGES: AromaStage[] = ['nose', 'palate', 'finish', 'overall'];

/** 시음 폼 → tastings 컬럼 값 + 단계별 아로마 태그. 유효하지 않으면 { error } */
export function parseTastingFields(formData: FormData) {
  const scores = {
    nose_score: parseScore(formData.get('nose_score')),
    palate_score: parseScore(formData.get('palate_score')),
    finish_score: parseScore(formData.get('finish_score')),
    overall_score: parseScore(formData.get('overall_score')),
  };
  if (Object.values(scores).includes('invalid')) {
    return { error: '점수는 0에서 100 사이여야 합니다.' as const };
  }

  const tastedAt = String(formData.get('tasted_at') ?? '').trim();
  if (!tastedAt) return { error: '시음일을 입력해주세요.' as const };

  const bottleId = parseOptionalText(formData.get('bottle_id'));
  const pour = parseOptionalNumber(formData.get('pour_ml'));
  if (pour != null && (!Number.isInteger(pour) || pour < 1 || pour > 1000)) {
    return { error: '따른 양은 1–1000ml 사이의 정수로 입력해주세요.' as const };
  }

  const buyAgain = String(formData.get('would_buy_again') ?? '');
  const color = String(formData.get('color') ?? '');

  return {
    fields: {
      bottle_id: bottleId,
      // 바 시음(보틀 없음)에서는 따른 양을 기록하지 않는다
      pour_ml: bottleId ? pour : null,
      tasted_at: tastedAt,
      location: parseOptionalText(formData.get('location')),
      ...(scores as Record<string, number | null>),
      serve: parseChoice(formData.get('serve'), SERVES),
      nose_intensity: parseChoice(formData.get('nose_intensity'), NOSE_INTENSITIES),
      palate_body: parseChoice(formData.get('palate_body'), PALATE_BODIES),
      palate_sweetness: parseChoice(formData.get('palate_sweetness'), PALATE_SWEETNESS),
      palate_texture: parseChoices(formData.getAll('palate_texture'), PALATE_TEXTURES),
      finish_length: parseChoice(formData.get('finish_length'), FINISH_LENGTHS),
      finish_character: parseChoices(formData.getAll('finish_character'), FINISH_CHARACTERS),
      nose_note: parseOptionalText(formData.get('nose_note')),
      palate_note: parseOptionalText(formData.get('palate_note')),
      finish_note: parseOptionalText(formData.get('finish_note')),
      comment: parseOptionalText(formData.get('comment')),
      pairing: parseOptionalText(formData.get('pairing')),
      would_buy_again: ['yes', 'no', 'maybe'].includes(buyAgain) ? buyAgain : null,
      price_paid: parseOptionalNumber(formData.get('price_paid')),
      color: HEX_COLOR_RE.test(color) || WHISKY_COLORS.some((c) => c.key === color) ? color : null,
      photo_url: parseOptionalText(formData.get('photo_url')),
      flight_id: parseOptionalText(formData.get('flight_id')),
      flight_position: parseOptionalNumber(formData.get('flight_position')),
      blind_guess: parseOptionalText(formData.get('blind_guess')),
    },
    aromas: AROMA_FIELD_STAGES.flatMap((stage) =>
      [...new Set(formData.getAll(`aroma_${stage}`).map(Number))]
        .filter((n) => Number.isInteger(n))
        .map((tag_id) => ({ stage, tag_id }))
    ),
  };
}
