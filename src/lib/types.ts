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
