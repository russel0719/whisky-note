'use server';

import { createClient } from '@/lib/supabase/server';
import type { CatalogEntry } from '@/lib/types';

/** 글로벌 카탈로그에서 이름/증류소로 검색 (PostgREST or 필터용으로 특수문자 제거) */
export async function searchCatalog(query: string): Promise<CatalogEntry[]> {
  const cleaned = query.trim().replace(/[,()]/g, ' ').replace(/\s+/g, ' ');
  if (cleaned.length < 2) return [];
  const supabase = await createClient();
  const { data } = await supabase
    .from('catalog')
    .select('*')
    .or(`name.ilike.%${cleaned}%,name_ko.ilike.%${cleaned}%,distillery.ilike.%${cleaned}%`)
    .order('name_ko')
    .limit(12);
  return (data ?? []) as CatalogEntry[];
}
