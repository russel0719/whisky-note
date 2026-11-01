import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { Eyebrow } from '@/components/ui';
import type { PickerWhisky } from '@/components/whisky-picker';
import type { Bottle } from '@/lib/types';
import { BottleForm, type PriceHistory } from '../../new/bottle-form';

export const metadata = { title: '보틀 수정' };

export default async function EditBottlePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  const [bottleRes, whiskiesRes, historyRes] = await Promise.all([
    supabase.from('bottles').select('*').eq('id', id).maybeSingle(),
    supabase.from('whiskies').select('id, name, catalog_id').order('name'),
    supabase
      .from('bottles')
      .select('id, whisky_id, purchase_date, purchase_price, purchase_place')
      .not('purchase_price', 'is', null),
  ]);

  const bottle = bottleRes.data as Bottle | null;
  if (!bottle) notFound();

  return (
    <div className="max-w-lg">
      <header className="mb-8">
        <Eyebrow>Purchase</Eyebrow>
        <h1 className="font-display text-[30px]">보틀 수정</h1>
      </header>
      <BottleForm
        whiskies={(whiskiesRes.data ?? []) as PickerWhisky[]}
        initial={bottle}
        priceHistory={(historyRes.data ?? []) as PriceHistory}
      />
    </div>
  );
}
