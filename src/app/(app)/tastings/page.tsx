import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { EmptyState, LinkCard, PageHeader, ScoreFigure } from '@/components/ui';
import { inputClass } from '@/components/form';
import { averageScore, formatDate } from '@/lib/format';
import { BUY_AGAIN_LABELS, type BuyAgain, type TastingWithWhisky } from '@/lib/types';

export const metadata = { title: '시음 노트' };

export default async function TastingsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; buy?: string; sort?: string }>;
}) {
  const { q, buy, sort } = await searchParams;
  const supabase = await createClient();

  let query = supabase
    .from('tastings')
    .select('*, whiskies!inner(*)')
    .order('tasted_at', { ascending: false })
    .order('created_at', { ascending: false });
  if (q) query = query.ilike('whiskies.name', `%${q}%`);
  if (buy && buy in BUY_AGAIN_LABELS) query = query.eq('would_buy_again', buy);

  const { data } = await query;
  let tastings = (data ?? []) as TastingWithWhisky[];

  const scoreOf = (t: TastingWithWhisky) =>
    t.overall_score ?? averageScore(t.nose_score, t.palate_score, t.finish_score);

  if (sort === 'score') {
    tastings = [...tastings].sort((a, b) => (scoreOf(b) ?? -1) - (scoreOf(a) ?? -1));
  }

  const hasFilter = Boolean(q || buy || sort);

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

      <form className="flex flex-wrap gap-2 mb-6">
        <input
          type="search"
          name="q"
          defaultValue={q ?? ''}
          placeholder="위스키 이름 검색"
          className={`${inputClass} rounded-full flex-1 min-w-40`}
        />
        <select name="buy" defaultValue={buy ?? ''} className={`${inputClass} rounded-full w-30`}>
          <option value="">재구매 전체</option>
          {(Object.keys(BUY_AGAIN_LABELS) as BuyAgain[]).map((key) => (
            <option key={key} value={key}>
              {BUY_AGAIN_LABELS[key]}
            </option>
          ))}
        </select>
        <select name="sort" defaultValue={sort ?? ''} className={`${inputClass} rounded-full w-28`}>
          <option value="">최신순</option>
          <option value="score">점수순</option>
        </select>
        <button
          type="submit"
          className="h-11 px-5 rounded-full bg-accent text-on-accent text-sm font-semibold shrink-0"
        >
          적용
        </button>
      </form>

      {tastings.length === 0 ? (
        <EmptyState
          message={
            hasFilter
              ? '조건에 맞는 노트가 없습니다.'
              : '아직 시음 노트가 없습니다. 첫 잔의 기억을 남겨보세요.'
          }
          ctaHref="/tastings/new"
          ctaLabel="시음 노트 작성"
        />
      ) : (
        <div className="space-y-3">
          {tastings.map((tasting) => (
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
              <ScoreFigure value={scoreOf(tasting)} />
            </LinkCard>
          ))}
        </div>
      )}
    </div>
  );
}
