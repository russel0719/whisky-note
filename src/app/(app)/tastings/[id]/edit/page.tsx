import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { Eyebrow } from '@/components/ui';
import type { AromaTag, Bottle, Flight, TastingFull } from '@/lib/types';
import type { PickerWhisky } from '@/components/whisky-picker';
import { TastingForm } from '../../new/tasting-form';

export const metadata = { title: '시음 노트 수정' };

export default async function EditTastingPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  const [tastingRes, whiskiesRes, bottlesRes, tagsRes] = await Promise.all([
    supabase
      .from('tastings')
      .select('*, whiskies(*), bottles(*), tasting_aromas(stage, aroma_tags(*))')
      .eq('id', id)
      .maybeSingle(),
    supabase.from('whiskies').select('id, name, catalog_id').order('name'),
    // 편집에서는 연결된 보틀이 공병이어도 목록에 있어야 한다
    supabase.from('bottles').select('*').order('purchase_date', { ascending: false }),
    supabase.from('aroma_tags').select('*').order('id'),
  ]);

  const tasting = tastingRes.data as TastingFull | null;
  if (!tasting) notFound();
  const { data: flight } = tasting.flight_id
    ? await supabase.from('flights').select('*').eq('id', tasting.flight_id).maybeSingle()
    : { data: null };

  return (
    <div className="max-w-lg">
      <header className="mb-8">
        <Eyebrow>Tasting</Eyebrow>
        <h1 className="font-display text-[30px]">노트 수정</h1>
      </header>
      <TastingForm
        whiskies={(whiskiesRes.data ?? []) as PickerWhisky[]}
        bottles={(bottlesRes.data ?? []) as Bottle[]}
        aromaTags={(tagsRes.data ?? []) as AromaTag[]}
        initial={tasting}
        flight={flight && { ...(flight as Flight), position: tasting.flight_position ?? 1 }}
      />
    </div>
  );
}
