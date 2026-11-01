/**
 * 과거 기록 가져오기 — 메모 형식의 후기 목록을 파싱하고, 10점 척도 점수를 앱의 100점제로 환산한다.
 *
 * 입력 형식 (한 줄에 하나):
 *   섹션 제목                       예) 피트/스모키
 *   이름(가격 만원)<공백/탭>점수     예) 라가불린 16Y(10.9)	7.5   → 구매 기록
 *   이름<공백/탭>점수               예) 아드벡 스모키버스	7.3     → 시음만
 *   "-"로 시작하는 줄은 설명으로 보고 건너뛴다.
 */

export interface LegacyRow {
  /** 입력 순서 (0부터) */
  index: number;
  section: string | null;
  /** 원문 이름 (가격 괄호 제외) */
  name: string;
  /** 카탈로그 검색용으로 표기를 다듬은 이름 (12Y → 12년 등) */
  searchName: string;
  /** 원 단위 구매가. 가격 괄호가 없으면 null(시음만) */
  price: number | null;
  /** 원점수 (10점 척도) */
  sourceScore: number;
}

const ROW_RE = /^(.+?)\s*(?:\(\s*(\d+(?:\.\d+)?)\s*\))?\s+(\d+(?:\.\d+)?)\s*$/;

/** 메모 표기를 카탈로그 한글명 표기에 가깝게 (12Y → 12년, DE → 디스틸러스 에디션) */
export function normalizeWhiskyName(name: string): string {
  return name
    .replace(/(\d+)\s*Y\b/gi, '$1년')
    .replace(/\bDE\b/g, '디스틸러스 에디션')
    .replace(/\s+/g, ' ')
    .trim();
}

export function parseLegacyReview(text: string, priceUnit = 10_000): LegacyRow[] {
  const rows: LegacyRow[] = [];
  let section: string | null = null;
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith('-')) continue;
    const m = ROW_RE.exec(line);
    if (!m) {
      section = line;
      continue;
    }
    const name = m[1].trim();
    rows.push({
      index: rows.length,
      section,
      name,
      searchName: normalizeWhiskyName(name),
      price: m[2] != null ? Math.round(Number(m[2]) * priceUnit) : null,
      sourceScore: Number(m[3]),
    });
  }
  return rows;
}

/**
 * 검색어와 카탈로그 항목의 일치 정도 (search_catalog와 같은 규칙: 공백 제거 후 단어 포함 여부).
 *   exact — 모든 단어 일치 → 그대로 연결
 *   near  — 단어가 3개 이상이고 하나만 빠짐 → 연결하되 확인 필요 표시
 *   weak  — 그 외 → 기본값은 직접 등록, 후보는 선택지로만
 */
export function matchLevel(
  query: string,
  entry: { name: string; name_ko: string | null; distillery: string | null }
): 'exact' | 'near' | 'weak' {
  const flat = [entry.name, entry.name_ko, entry.distillery]
    .filter(Boolean)
    .join('')
    .toLowerCase()
    .replace(/\s+/g, '');
  const tokens = query.toLowerCase().split(/\s+/).filter(Boolean);
  const matched = tokens.filter((t) => flat.includes(t)).length;
  if (matched === tokens.length) return 'exact';
  if (tokens.length >= 3 && matched === tokens.length - 1) return 'near';
  return 'weak';
}

export interface ScoreMapping {
  slope: number;
  intercept: number;
  /** default: 겹치는 기록 없음 / shift: 기울기 고정, 높이만 맞춤 / fit: 최소제곱 직선 */
  method: 'default' | 'shift' | 'fit';
  /** 추정에 쓴 (원점수, 앱 점수) 쌍 개수 */
  n: number;
}

/** 겹치는 기록이 없을 때: 5점(기준 위스키) = 70점, 1점당 6점 */
export const DEFAULT_MAPPING: ScoreMapping = { slope: 6, intercept: 40, method: 'default', n: 0 };

/** 기울기가 이 범위를 벗어나면 데이터가 너무 적거나 들쭉날쭉한 것으로 보고 기본 기울기를 쓴다 */
const SLOPE_RANGE: [number, number] = [2, 15];

/**
 * 같은 위스키에 대한 (원점수, 앱 점수) 쌍으로 환산식을 추정한다.
 * 2쌍 이상이고 원점수가 퍼져 있으면 최소제곱 직선, 아니면 기본 기울기로 평균점만 맞춘다.
 */
export function fitScoreMapping(pairs: { source: number; score: number }[]): ScoreMapping {
  const n = pairs.length;
  if (n === 0) return DEFAULT_MAPPING;
  const mx = pairs.reduce((s, p) => s + p.source, 0) / n;
  const my = pairs.reduce((s, p) => s + p.score, 0) / n;
  const shift: ScoreMapping = {
    slope: DEFAULT_MAPPING.slope,
    intercept: my - DEFAULT_MAPPING.slope * mx,
    method: 'shift',
    n,
  };
  if (n < 2) return shift;

  const sxx = pairs.reduce((s, p) => s + (p.source - mx) ** 2, 0);
  if (sxx < 1e-9) return shift;
  const sxy = pairs.reduce((s, p) => s + (p.source - mx) * (p.score - my), 0);
  const slope = sxy / sxx;
  if (slope < SLOPE_RANGE[0] || slope > SLOPE_RANGE[1]) return shift;
  return { slope, intercept: my - slope * mx, method: 'fit', n };
}

export function applyMapping(
  mapping: Pick<ScoreMapping, 'slope' | 'intercept'>,
  source: number
): number {
  return Math.max(0, Math.min(100, Math.round(mapping.intercept + mapping.slope * source)));
}
