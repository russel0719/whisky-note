import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { EmptyState, LinkCard, PageHeader, ScoreFigure } from '@/components/ui';
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
      <PageHeader
        eyebrow="Notes"
        title="시음 노트"
        action={
          <Link
            href="/tastings/new"
            className="h-10 px-4 inline-flex items-center rounded-full border border-accent text-accent-bright text-sm"
          >
            + 작성
          </Link>
        }
      />

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
              <LinkCard
                key={tasting.id}
                href={`/tastings/${tasting.id}`}
                className="flex items-center justify-between gap-4"
              >
                <div className="min-w-0">
                  <p className="font-semibold truncate">{tasting.whiskies.name}</p>
                  <p className="text-sm text-muted mt-0.5 truncate">
                    {formatDate(tasting.tasted_at)}
                    {tasting.location ? ` · ${tasting.location}` : ''}
                    {tasting.comment ? ` · ${tasting.comment}` : ''}
                  </p>
                </div>
                <ScoreFigure value={score} />
              </LinkCard>
            );
          })}
        </div>
      )}
    </div>
  );
}
