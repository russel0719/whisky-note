import { createClient } from '@/lib/supabase/server';
import { Eyebrow } from '@/components/ui';
import type { PickerWhisky } from '@/components/whisky-picker';
import { BottleForm, type PriceHistory } from './bottle-form';

export const metadata = { title: '구매 기록' };

export default async function NewBottlePage({
  searchParams,
}: {
  searchParams: Promise<{ whisky?: string }>;
}) {
  const { whisky } = await searchParams;
  const supabase = await createClient();
  const [whiskiesRes, historyRes] = await Promise.all([
    supabase.from('whiskies').select('id, name, catalog_id').order('name'),
    supabase
      .from('bottles')
      .select('id, whisky_id, purchase_date, purchase_price, purchase_place')
      .not('purchase_price', 'is', null),
  ]);
  const whiskies = (whiskiesRes.data ?? []) as PickerWhisky[];

  return (
    <div className="max-w-lg">
      <header className="mb-8">
        <Eyebrow>Purchase</Eyebrow>
        <h1 className="font-display text-[30px]">구매 기록</h1>
      </header>
      <BottleForm
        whiskies={whiskies}
        defaultWhiskyId={whisky}
        priceHistory={(historyRes.data ?? []) as PriceHistory}
      />
    </div>
  );
}
