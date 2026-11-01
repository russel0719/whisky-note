import { createClient } from '@/lib/supabase/server';
import { formatDate, tastingDescriptors } from '@/lib/format';
import { renderShareCard } from '@/lib/share-card';
import { CATEGORY_LABELS, SERVES, type Tasting, type Whisky } from '@/lib/types';

/** 시음 노트 공유 카드 PNG (로그인 사용자 본인 노트만 — 미들웨어 + RLS) */
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data } = await supabase
    .from('tastings')
    .select('*, whiskies(*), tasting_aromas(aroma_tags(name))')
    .eq('id', id)
    .maybeSingle();
  if (!data) return new Response('Not found', { status: 404 });

  const t = data as Tasting & {
    whiskies: Whisky | null;
    tasting_aromas: { aroma_tags: { name: string } | null }[];
  };
  const w = t.whiskies;
  const descriptors = tastingDescriptors({ ...t, serve: null });

  try {
    return await renderShareCard({
      name: w?.name ?? `블라인드 ${t.flight_position ?? ''}번 잔`,
      date: formatDate(t.tasted_at),
      meta: [
        w ? CATEGORY_LABELS[w.category] : null,
        w?.distillery,
        w?.region,
        t.serve ? SERVES[t.serve] : null,
      ].filter((v): v is string => !!v),
      score: t.score,
      stages: [
        { label: 'Nose', score: t.nose_score },
        { label: 'Palate', score: t.palate_score },
        { label: 'Finish', score: t.finish_score },
      ],
      descriptors: descriptors ? descriptors.split(' · ') : [],
      aromas: [...new Set(t.tasting_aromas.flatMap((row) => row.aroma_tags?.name ?? []))],
      comment: t.comment,
      color: t.color,
    });
  } catch (err) {
    return new Response(`카드를 만들지 못했습니다: ${(err as Error).message}`, { status: 502 });
  }
}
