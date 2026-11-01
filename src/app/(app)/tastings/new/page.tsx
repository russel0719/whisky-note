import { createClient } from '@/lib/supabase/server';
import { Eyebrow } from '@/components/ui';
import type { PickerWhisky } from '@/components/whisky-picker';
import type { AromaTag, Bottle, CatalogEntry, Flight } from '@/lib/types';
import { TastingForm } from './tasting-form';

export const metadata = { title: '시음 노트 작성' };

export default async function NewTastingPage({
  searchParams,
}: {
  searchParams: Promise<{ whisky?: string; bottle?: string; catalog?: string; flight?: string }>;
}) {
  const { whisky, bottle, catalog, flight } = await searchParams;
  const supabase = await createClient();

  const [whiskiesRes, bottlesRes, tagsRes, catalogRes, flightRes, lastGlassRes] = await Promise.all(
    [
      supabase.from('whiskies').select('id, name, catalog_id').order('name'),
      supabase
        .from('bottles')
        .select('*')
        .neq('status', 'finished')
        .order('purchase_date', { ascending: false }),
      supabase.from('aroma_tags').select('*').order('id'),
      // 위시리스트 등에서 카탈로그 항목을 골라 들어온 경우
      catalog
        ? supabase.from('catalog').select('*').eq('id', catalog).maybeSingle()
        : Promise.resolve({ data: null }),
      flight
        ? supabase.from('flights').select('*').eq('id', flight).maybeSingle()
        : Promise.resolve({ data: null }),
      flight
        ? supabase
            .from('tastings')
            .select('flight_position')
            .eq('flight_id', flight)
            .order('flight_position', { ascending: false, nullsFirst: false })
            .limit(1)
            .maybeSingle()
        : Promise.resolve({ data: null }),
    ]
  );
  const flightRow = flightRes.data as Flight | null;
  const lastPosition = (lastGlassRes.data as { flight_position: number | null } | null)
    ?.flight_position;

  return (
    <div className="max-w-lg">
      <header className="mb-8">
        <Eyebrow>Tasting</Eyebrow>
        <h1 className="font-display text-[30px]">시음 노트</h1>
      </header>
      <TastingForm
        whiskies={(whiskiesRes.data ?? []) as PickerWhisky[]}
        bottles={(bottlesRes.data ?? []) as Bottle[]}
        aromaTags={(tagsRes.data ?? []) as AromaTag[]}
        defaultWhiskyId={whisky}
        defaultBottleId={bottle}
        defaultCatalog={catalogRes.data as CatalogEntry | null}
        flight={flightRow && { ...flightRow, position: (lastPosition ?? 0) + 1 }}
      />
    </div>
  );
}
