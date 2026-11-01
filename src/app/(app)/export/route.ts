import { createClient } from '@/lib/supabase/server';
import { toCsv } from '@/lib/csv';
import {
  BUY_AGAIN_LABELS,
  CATEGORY_LABELS,
  FINISH_CHARACTERS,
  FINISH_LENGTHS,
  NOSE_INTENSITIES,
  PALATE_BODIES,
  PALATE_SWEETNESS,
  PALATE_TEXTURES,
  SERVES,
  type AromaStage,
  type Bottle,
  type Tasting,
  type Whisky,
} from '@/lib/types';

type ExportTasting = Tasting & {
  whiskies: Whisky | null;
  bottles: Bottle | null;
  tasting_aromas: { stage: AromaStage; aroma_tags: { name: string } | null }[];
};

/**
 * 데이터 내보내기 (백업 겸용). 로그인 확인은 미들웨어가, 행 범위는 RLS가 맡는다.
 *   /export?format=json — 위스키·보틀·시음(아로마 포함)·위시리스트 전체
 *   /export?format=csv  — 시음 노트를 한 줄씩 (스프레드시트용)
 */
export async function GET(request: Request) {
  const format = new URL(request.url).searchParams.get('format') === 'csv' ? 'csv' : 'json';
  const supabase = await createClient();
  const date = new Date().toISOString().slice(0, 10);

  const tastingsQuery = supabase
    .from('tastings')
    .select('*, whiskies(*), bottles(*), tasting_aromas(stage, aroma_tags(name))')
    .order('tasted_at', { ascending: true });

  if (format === 'json') {
    const [whiskies, bottles, tastings, wishlist] = await Promise.all([
      supabase.from('whiskies').select('*').order('created_at'),
      supabase.from('bottles').select('*').order('purchase_date'),
      tastingsQuery,
      supabase.from('wishlist').select('*').order('created_at'),
    ]);
    const failed = [whiskies, bottles, tastings, wishlist].find((r) => r.error);
    if (failed?.error) return new Response(failed.error.message, { status: 500 });

    const body = JSON.stringify(
      {
        exported_at: new Date().toISOString(),
        whiskies: whiskies.data,
        bottles: bottles.data,
        tastings: tastings.data,
        wishlist: wishlist.data,
      },
      null,
      2
    );
    return new Response(body, {
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'Content-Disposition': `attachment; filename="whisky-note-${date}.json"`,
      },
    });
  }

  const { data, error } = await tastingsQuery;
  if (error) return new Response(error.message, { status: 500 });
  const tastings = (data ?? []) as ExportTasting[];

  const aromasOf = (t: ExportTasting, stage: AromaStage) =>
    t.tasting_aromas
      .filter((row) => row.stage === stage)
      .map((row) => row.aroma_tags?.name)
      .filter(Boolean)
      .join(' / ');
  const labels = <K extends string>(keys: K[], map: Record<K, string>) =>
    keys.map((k) => map[k]).join(' / ');

  const csv = toCsv(
    [
      '시음일',
      '위스키',
      '분류',
      '증류소',
      '지역',
      '점수',
      'Nose',
      'Palate',
      'Finish',
      '총점',
      '마신 방식',
      '향 강도',
      '바디',
      '단맛',
      '질감',
      '여운 길이',
      '여운 특징',
      '아로마(Nose)',
      '아로마(Palate)',
      '아로마(Finish)',
      '아로마(단계 미지정)',
      '총평',
      'Nose 노트',
      'Palate 노트',
      'Finish 노트',
      '장소',
      '페어링',
      '재구매',
      '잔 가격',
      '따른 양(ml)',
      '보틀 구매일',
      '컬러',
    ],
    tastings.map((t) => [
      t.tasted_at,
      t.whiskies?.name,
      t.whiskies ? CATEGORY_LABELS[t.whiskies.category] : null,
      t.whiskies?.distillery,
      t.whiskies?.region,
      t.score,
      t.nose_score,
      t.palate_score,
      t.finish_score,
      t.overall_score,
      t.serve ? SERVES[t.serve] : null,
      t.nose_intensity ? NOSE_INTENSITIES[t.nose_intensity] : null,
      t.palate_body ? PALATE_BODIES[t.palate_body] : null,
      t.palate_sweetness ? PALATE_SWEETNESS[t.palate_sweetness] : null,
      labels(t.palate_texture, PALATE_TEXTURES),
      t.finish_length ? FINISH_LENGTHS[t.finish_length] : null,
      labels(t.finish_character, FINISH_CHARACTERS),
      aromasOf(t, 'nose'),
      aromasOf(t, 'palate'),
      aromasOf(t, 'finish'),
      aromasOf(t, 'overall'),
      t.comment,
      t.nose_note,
      t.palate_note,
      t.finish_note,
      t.location,
      t.pairing,
      t.would_buy_again ? BUY_AGAIN_LABELS[t.would_buy_again] : null,
      t.price_paid,
      t.pour_ml,
      t.bottles?.purchase_date,
      t.color,
    ])
  );
  return new Response(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="whisky-note-tastings-${date}.csv"`,
    },
  });
}
