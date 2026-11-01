'use server';

import { createClient } from '@/lib/supabase/server';
import { tastingDescriptors } from '@/lib/format';
import type { Tasting } from '@/lib/types';

export interface LastTasting {
  id: string;
  tasted_at: string;
  score: number | null;
  descriptors: string | null;
  aromas: string[];
  comment: string | null;
}

/** 이 위스키의 가장 최근 시음 기록 — 새 노트 작성 시 비교용 */
export async function getLastTasting(whiskyId: string): Promise<LastTasting | null> {
  if (!whiskyId) return null;
  const supabase = await createClient();
  const { data } = await supabase
    .from('tastings')
    .select('*, tasting_aromas(aroma_tags(name))')
    .eq('whisky_id', whiskyId)
    .order('tasted_at', { ascending: false })
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!data) return null;
  const t = data as Tasting & { tasting_aromas: { aroma_tags: { name: string } | null }[] };
  return {
    id: t.id,
    tasted_at: t.tasted_at,
    score: t.score,
    descriptors: tastingDescriptors(t),
    aromas: [...new Set(t.tasting_aromas.flatMap((row) => row.aroma_tags?.name ?? []))],
    comment: t.comment,
  };
}
