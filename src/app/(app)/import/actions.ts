'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import {
  matchLevel,
  normalizeWhiskyName,
  parseLegacyReview,
  type LegacyRow,
} from '@/lib/legacy-import';
import { BOTTLE_STATUSES, type BottleStatus, type CatalogEntry } from '@/lib/types';

export type ImportCandidate = Pick<CatalogEntry, 'id' | 'name' | 'name_ko' | 'category'> & {
  level: 'exact' | 'near' | 'weak';
};

/** 카탈로그 검색 상위 3개 + 일치 정도 */
async function findCandidates(
  supabase: Awaited<ReturnType<typeof createClient>>,
  query: string
): Promise<ImportCandidate[]> {
  const { data } = await supabase.rpc('search_catalog', { p_query: query, p_limit: 3 });
  return ((data ?? []) as CatalogEntry[]).map((e) => ({
    id: e.id,
    name: e.name,
    name_ko: e.name_ko,
    category: e.category,
    level: matchLevel(query, e),
  }));
}

/** 미리보기에서 줄 하나를 다른 표기로 다시 검색 */
export async function searchImportCandidates(query: string): Promise<ImportCandidate[]> {
  const cleaned = normalizeWhiskyName(query);
  if (cleaned.length < 2) return [];
  return findCandidates(await createClient(), cleaned);
}

export interface AnalyzedRow extends LegacyRow {
  /** 카탈로그 후보 (검색 상위 3개) */
  candidates: ImportCandidate[];
  /** 이미 등록된 내 위스키 (카탈로그 연결 또는 같은 이름) */
  myWhisky: { id: string; name: string } | null;
  /** 그 위스키에 앱에서 직접 매긴 점수의 평균 — 환산식 추정에 쓴다 */
  existingScore: number | null;
}

const normalize = (s: string) => s.toLowerCase().replace(/\s+/g, '');

/** 붙여 넣은 후기 목록을 파싱하고 카탈로그·내 위스키와 짝짓는다 (저장하지 않음) */
export async function analyzeImport(text: string): Promise<AnalyzedRow[]> {
  const rows = parseLegacyReview(text);
  if (rows.length === 0) return [];
  const supabase = await createClient();

  const [whiskiesRes, tastingsRes] = await Promise.all([
    supabase.from('whiskies').select('id, name, catalog_id'),
    // 가져온 기록(source_score 있음)은 기준에서 제외 — 다시 가져와도 환산식이 스스로를 따라가지 않게
    supabase
      .from('tastings')
      .select('whisky_id, score')
      .is('source_score', null)
      .not('score', 'is', null)
      .not('whisky_id', 'is', null),
  ]);
  const whiskies = (whiskiesRes.data ?? []) as {
    id: string;
    name: string;
    catalog_id: string | null;
  }[];
  const scoresByWhisky = new Map<string, number[]>();
  for (const t of (tastingsRes.data ?? []) as { whisky_id: string; score: number }[]) {
    scoresByWhisky.set(t.whisky_id, [...(scoresByWhisky.get(t.whisky_id) ?? []), t.score]);
  }

  // 카탈로그 검색은 줄마다 한 번 — 동시에 6개씩
  const candidates: AnalyzedRow['candidates'][] = new Array(rows.length);
  for (let i = 0; i < rows.length; i += 6) {
    await Promise.all(
      rows.slice(i, i + 6).map(async (row) => {
        candidates[row.index] = await findCandidates(supabase, row.searchName);
      })
    );
  }

  return rows.map((row) => {
    // 약한(weak) 후보로 내 위스키를 잘못 짝짓지 않도록 확실한 후보만 본다
    const top = candidates[row.index].find((c) => c.level !== 'weak');
    const names = new Set([normalize(row.name), normalize(row.searchName)]);
    const mine =
      whiskies.find((w) => top && w.catalog_id === top.id) ??
      whiskies.find((w) => names.has(normalize(w.name))) ??
      null;
    const scores = mine ? scoresByWhisky.get(mine.id) : undefined;
    return {
      ...row,
      candidates: candidates[row.index],
      myWhisky: mine ? { id: mine.id, name: mine.name } : null,
      existingScore: scores?.length
        ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)
        : null,
    };
  });
}

export interface ImportRowPayload {
  whisky_id?: string;
  catalog_id?: string;
  name: string;
  tasted_at: string;
  score: number;
  source_score: number;
  price: number | null;
  bottle_status: BottleStatus;
}

export interface ImportResult {
  error?: string;
  imported?: number;
}

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

/** 미리보기에서 확정한 행을 한 트랜잭션으로 저장 (import_tastings) */
export async function commitImport(_prev: ImportResult, formData: FormData): Promise<ImportResult> {
  let rows: ImportRowPayload[];
  try {
    rows = JSON.parse(String(formData.get('rows') ?? '[]'));
  } catch {
    return { error: '잘못된 요청입니다.' };
  }
  if (!Array.isArray(rows) || rows.length === 0) return { error: '가져올 기록을 선택해주세요.' };

  const clean = [];
  for (const r of rows) {
    if (!r.name?.trim() || !DATE_RE.test(r.tasted_at))
      return { error: '이름과 날짜를 확인해주세요.' };
    if (!Number.isInteger(r.score) || r.score < 0 || r.score > 100) {
      return { error: `${r.name}: 점수는 0–100 사이 정수여야 합니다.` };
    }
    clean.push({
      whisky_id: r.whisky_id || undefined,
      catalog_id: r.whisky_id ? undefined : r.catalog_id || undefined,
      name: r.name.trim(),
      tasted_at: r.tasted_at,
      score: r.score,
      source_score: r.source_score,
      price: r.price != null && r.price >= 0 ? Math.round(r.price) : undefined,
      bottle_status: BOTTLE_STATUSES.includes(r.bottle_status) ? r.bottle_status : 'finished',
    });
  }

  const supabase = await createClient();
  const { data, error } = await supabase.rpc('import_tastings', { p_rows: clean });
  if (error) return { error: `가져오기에 실패했습니다: ${error.message}` };

  revalidatePath('/');
  revalidatePath('/tastings');
  revalidatePath('/whiskies');
  revalidatePath('/bottles');
  revalidatePath('/stats');
  return { imported: data as number };
}
