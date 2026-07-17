import { createClient } from '@/lib/supabase/server';
import { Eyebrow } from '@/components/ui';
import type { AromaTag, Bottle } from '@/lib/types';
import { TastingForm } from './tasting-form';

export const metadata = { title: '시음 노트 작성' };

export default async function NewTastingPage({
  searchParams,
}: {
  searchParams: Promise<{ whisky?: string; bottle?: string }>;
}) {
  const { whisky, bottle } = await searchParams;
  const supabase = await createClient();

  const [whiskiesRes, bottlesRes, tagsRes] = await Promise.all([
    supabase.from('whiskies').select('id, name').order('name'),
    supabase
      .from('bottles')
      .select('*')
      .neq('status', 'finished')
      .order('purchase_date', { ascending: false }),
    supabase.from('aroma_tags').select('*').order('id'),
  ]);

  return (
    <div className="max-w-lg">
      <header className="mb-8">
        <Eyebrow>Tasting</Eyebrow>
        <h1 className="font-display text-[30px]">시음 노트</h1>
      </header>
      <TastingForm
        whiskies={(whiskiesRes.data ?? []) as { id: string; name: string }[]}
        bottles={(bottlesRes.data ?? []) as Bottle[]}
        aromaTags={(tagsRes.data ?? []) as AromaTag[]}
        defaultWhiskyId={whisky}
        defaultBottleId={bottle}
      />
    </div>
  );
}
