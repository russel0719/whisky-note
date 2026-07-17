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

/** 위스키 색상 12단계 (SMWS 컬러 차트 근사). key가 tastings.color에 저장된다. */
export const WHISKY_COLORS = [
  { key: 'pale-straw', label: '페일 스트로', hex: '#ede1b1' },
  { key: 'straw', label: '스트로', hex: '#e6d089' },
  { key: 'pale-gold', label: '페일 골드', hex: '#dfc06c' },
  { key: 'gold', label: '골드', hex: '#d9b259' },
  { key: 'deep-gold', label: '딥 골드', hex: '#cfa03f' },
  { key: 'amber', label: '앰버', hex: '#c68e2e' },
  { key: 'deep-amber', label: '딥 앰버', hex: '#b87c22' },
  { key: 'copper', label: '코퍼', hex: '#a96b1d' },
  { key: 'burnished', label: '버니시드', hex: '#985c1b' },
  { key: 'tawny', label: '토니', hex: '#874d19' },
  { key: 'auburn', label: '어번', hex: '#744016' },
  { key: 'mahogany', label: '마호가니', hex: '#5e3212' },
] as const;
export type WhiskyColorKey = (typeof WHISKY_COLORS)[number]['key'];

export function whiskyColor(key: string | null | undefined) {
  return WHISKY_COLORS.find((c) => c.key === key) ?? null;
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
