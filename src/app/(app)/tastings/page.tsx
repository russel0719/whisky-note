import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { Card, EmptyState } from '@/components/ui';
import { averageScore, formatDate } from '@/lib/format';
import type { TastingWithWhisky } from '@/lib/types';

export const metadata = { title: '시음 노트' };

export default async function TastingsPage() {
  const supabase = await createClient();
  const { data } = await supabase
    .from('tastings')
    .select('*, whiskies(*)')
    .order('tasted_at', { ascending: false })
    .order('created_at', { ascending: false });
  const tastings = (data ?? []) as TastingWithWhisky[];

  return (
    <div>
      <header className="flex items-end justify-between mb-6">
        <div>
          <p className="text-accent text-sm tracking-[0.25em] uppercase mb-2">Notes</p>
          <h1 className="text-[28px]">시음 노트</h1>
        </div>
        <Link
          href="/tastings/new"
          className="h-10 px-4 inline-flex items-center rounded-full border border-accent text-accent-bright text-sm"
        >
          + 작성
        </Link>
      </header>

      {tastings.length === 0 ? (
        <EmptyState
          message="아직 시음 노트가 없습니다. 첫 잔의 기억을 남겨보세요."
          ctaHref="/tastings/new"
          ctaLabel="시음 노트 작성"
        />
      ) : (
        <div className="space-y-3">
          {tastings.map((tasting) => {
            const score =
              tasting.overall_score ??
              averageScore(tasting.nose_score, tasting.palate_score, tasting.finish_score);
            return (
              <Link key={tasting.id} href={`/tastings/${tasting.id}`} className="block">
                <Card className="flex items-center justify-between gap-4">
                  <div className="min-w-0">
                    <p className="font-semibold truncate">{tasting.whiskies.name}</p>
                    <p className="text-sm text-muted mt-0.5 truncate">
                      {formatDate(tasting.tasted_at)}
                      {tasting.location ? ` · ${tasting.location}` : ''}
                      {tasting.comment ? ` · ${tasting.comment}` : ''}
                    </p>
                  </div>
                  <p className="text-[22px] font-semibold text-accent-bright tabular-nums shrink-0">
                    {score ?? '—'}
                  </p>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
