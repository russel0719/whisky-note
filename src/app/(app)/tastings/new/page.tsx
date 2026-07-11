import { createClient } from '@/lib/supabase/server';
import type { AromaTag, Bottle } from '@/lib/types';
import { TastingForm } from './tasting-form';

export const metadata = { title: '시음 노트 작성' };

export default async function NewTastingPage({
  searchParams,
}: {
  searchParams: Promise<{ whisky?: string }>;
}) {
  const { whisky } = await searchParams;
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
        <p className="text-accent text-sm tracking-[0.25em] uppercase mb-2">Tasting</p>
        <h1 className="text-[28px]">시음 노트</h1>
      </header>
      <TastingForm
        whiskies={(whiskiesRes.data ?? []) as { id: string; name: string }[]}
        bottles={(bottlesRes.data ?? []) as Bottle[]}
        aromaTags={(tagsRes.data ?? []) as AromaTag[]}
        defaultWhiskyId={whisky}
      />
    </div>
  );
}
