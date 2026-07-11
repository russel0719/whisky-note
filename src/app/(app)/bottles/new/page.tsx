import { createClient } from '@/lib/supabase/server';
import { EmptyState } from '@/components/ui';
import { BottleForm } from './bottle-form';

export const metadata = { title: '구매 기록' };

export default async function NewBottlePage({
  searchParams,
}: {
  searchParams: Promise<{ whisky?: string }>;
}) {
  const { whisky } = await searchParams;
  const supabase = await createClient();
  const { data } = await supabase.from('whiskies').select('id, name').order('name');
  const whiskies = (data ?? []) as { id: string; name: string }[];

  return (
    <div className="max-w-lg">
      <header className="mb-8">
        <p className="text-accent text-sm tracking-[0.25em] uppercase mb-2">Purchase</p>
        <h1 className="text-[28px]">구매 기록</h1>
      </header>
      {whiskies.length === 0 ? (
        <EmptyState
          message="먼저 위스키를 등록해주세요."
          ctaHref="/whiskies/new"
          ctaLabel="위스키 등록"
        />
      ) : (
        <BottleForm whiskies={whiskies} defaultWhiskyId={whisky} />
      )}
    </div>
  );
}
