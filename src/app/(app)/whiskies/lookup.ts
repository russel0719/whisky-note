'use server';

import { createClient } from '@/lib/supabase/server';
import type { CatalogEntry } from '@/lib/types';

/** 글로벌 카탈로그 검색 — 단어 순서·띄어쓰기·영문 오타에 강한 DB 함수(search_catalog) 사용 */
export async function searchCatalog(query: string): Promise<CatalogEntry[]> {
  const cleaned = query.trim().replace(/\s+/g, ' ');
  if (cleaned.length < 2) return [];
  const supabase = await createClient();
  const { data } = await supabase.rpc('search_catalog', { p_query: cleaned, p_limit: 12 });
  return (data ?? []) as CatalogEntry[];
}
