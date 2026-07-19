// whisky_note 스키마의 행 타입 (supabase/migrations/20260711000000_init.sql 과 동기 유지)

export const CATEGORIES = [
  'single_malt',
  'blended',
  'blended_malt',
  'grain',
  'bourbon',
  'rye',
  'irish',
  'japanese',
  'other',
] as const;
export type Category = (typeof CATEGORIES)[number];

export const CATEGORY_LABELS: Record<Category, string> = {
  single_malt: '싱글몰트',
  blended: '블렌디드',
  blended_malt: '블렌디드 몰트',
  grain: '그레인',
  bourbon: '버번',
  rye: '라이',
  irish: '아이리시',
  japanese: '재패니즈',
  other: '기타',
};

export const BOTTLE_STATUSES = ['unopened', 'open', 'finished'] as const;
export type BottleStatus = (typeof BOTTLE_STATUSES)[number];

export const BOTTLE_STATUS_LABELS: Record<BottleStatus, string> = {
  unopened: '미개봉',
  open: '개봉',
  finished: '공병',
};

export const BUY_AGAIN_LABELS = {
  yes: '재구매',
  maybe: '고민',
  no: '패스',
} as const;
export type BuyAgain = keyof typeof BUY_AGAIN_LABELS;

export const AROMA_GROUPS = [
  'fruit',
  'floral',
  'sweet',
  'cereal',
  'peat',
  'sherry',
  'wood',
  'spice',
  'other',
] as const;
export type AromaGroup = (typeof AROMA_GROUPS)[number];

export const AROMA_GROUP_LABELS: Record<AromaGroup, string> = {
  fruit: '과일',
  floral: '플로럴',
  sweet: '단맛',
  cereal: '곡물',
  peat: '피트',
  sherry: '셰리',
  wood: '오크',
  spice: '향신료',
  other: '기타',
};

/** 위스키 색상 그라디언트 기준점 16단계 (whiskys.co.uk 컬러 가이드 근사, 레드 계열 포함).
 * tastings.color에는 연속 선택된 hex(`#rrggbb`)가 저장되고, 라벨은 가장 가까운 단계명으로 표시한다.
 * (초기 버전은 key 문자열을 저장했으므로 key/legacy key도 계속 해석한다.) */
export const WHISKY_COLORS = [
  { key: 'gin-clear', label: '진 클리어', hex: '#f6f1e0' },
  { key: 'white-wine', label: '화이트 와인', hex: '#f2ebc4' },
  { key: 'pale-straw', label: '페일 스트로', hex: '#eee1a6' },
  { key: 'pale-gold', label: '페일 골드', hex: '#e8d283' },
  { key: 'yellow-gold', label: '옐로 골드', hex: '#e3c161' },
  { key: 'old-gold', label: '올드 골드', hex: '#dcae45' },
  { key: 'amber', label: '앰버', hex: '#d49a32' },
  { key: 'deep-gold', label: '딥 골드', hex: '#c98626' },
  { key: 'deep-copper', label: '딥 코퍼', hex: '#b96f1e' },
  { key: 'burnished', label: '버니시드', hex: '#a85a1a' },
  { key: 'tawny', label: '토니', hex: '#96471d' },
  { key: 'russet', label: '러셋', hex: '#883723' },
  { key: 'auburn', label: '어번', hex: '#762c20' },
  { key: 'mahogany', label: '마호가니', hex: '#61221a' },
  { key: 'burnt-umber', label: '번트 엄버', hex: '#4e1e18' },
  { key: 'treacle', label: '트리클', hex: '#371510' },
] as const;

/** 초기 12단계 팔레트에서 제거된 key → hex (기존 저장값 표시용) */
const LEGACY_COLOR_HEX: Record<string, string> = {
  straw: '#e6d089',
  gold: '#d9b259',
  'deep-amber': '#b87c22',
  copper: '#a96b1d',
};

export function hexToRgb(hex: string): [number, number, number] {
  return [
    parseInt(hex.slice(1, 3), 16),
    parseInt(hex.slice(3, 5), 16),
    parseInt(hex.slice(5, 7), 16),
  ];
}

export const HEX_COLOR_RE = /^#[0-9a-f]{6}$/i;

function nearestColorStop(hex: string) {
  const [r, g, b] = hexToRgb(hex);
  let best: (typeof WHISKY_COLORS)[number] = WHISKY_COLORS[0];
  let bestDist = Infinity;
  for (const stop of WHISKY_COLORS) {
    const [sr, sg, sb] = hexToRgb(stop.hex);
    const dist = (r - sr) ** 2 + (g - sg) ** 2 + (b - sb) ** 2;
    if (dist < bestDist) {
      bestDist = dist;
      best = stop;
    }
  }
  return best;
}

/** 저장값(hex 또는 key)을 표시용 { label, hex }로 해석 */
export function whiskyColor(
  value: string | null | undefined
): { label: string; hex: string } | null {
  if (!value) return null;
  const stop = WHISKY_COLORS.find((c) => c.key === value);
  if (stop) return { label: stop.label, hex: stop.hex };
  const hex = HEX_COLOR_RE.test(value) ? value : LEGACY_COLOR_HEX[value];
  if (!hex) return null;
  return { label: nearestColorStop(hex).label, hex };
}

export interface Whisky {
  id: string;
  user_id: string;
  name: string;
  distillery: string | null;
  category: Category;
  region: string | null;
  abv: number | null;
  age_years: number | null;
  cask_type: string | null;
  image_url: string | null;
  created_at: string;
}

export interface Bottle {
  id: string;
  user_id: string;
  whisky_id: string;
  purchase_date: string;
  purchase_price: number | null;
  purchase_place: string | null;
  size_ml: number;
  open_date: string | null;
  remaining_pct: number;
  status: BottleStatus;
  created_at: string;
}

export interface Tasting {
  id: string;
  user_id: string;
  whisky_id: string;
  bottle_id: string | null;
  tasted_at: string;
  location: string | null;
  nose_score: number | null;
  palate_score: number | null;
  finish_score: number | null;
  overall_score: number | null;
  nose_note: string | null;
  palate_note: string | null;
  finish_note: string | null;
  comment: string | null;
  pairing: string | null;
  would_buy_again: BuyAgain | null;
  price_paid: number | null;
  color: string | null;
  photo_url: string | null;
  created_at: string;
}

export interface CatalogEntry {
  id: string;
  name: string;
  name_ko: string | null;
  distillery: string | null;
  category: Category;
  region: string | null;
  country: string | null;
  abv: number | null;
  age_years: number | null;
  cask_type: string | null;
}

export interface AromaTag {
  id: number;
  name: string;
  grp: AromaGroup;
}

export type BottleWithWhisky = Bottle & { whiskies: Whisky };
export type TastingWithWhisky = Tasting & { whiskies: Whisky };
export type TastingFull = Tasting & {
  whiskies: Whisky;
  bottles: Bottle | null;
  tasting_aromas: { aroma_tags: AromaTag }[];
};
