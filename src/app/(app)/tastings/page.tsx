import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { EmptyState, LinkCard, PageHeader, ScoreFigure } from '@/components/ui';
import { inputClass } from '@/components/form';
import { averageScore, formatDate } from '@/lib/format';
import {
  AROMA_GROUPS,
  AROMA_GROUP_LABELS,
  BUY_AGAIN_LABELS,
  type AromaTag,
  type BuyAgain,
  type TastingWithWhisky,
} from '@/lib/types';

export const metadata = { title: '시음 노트' };

const MIN_SCORE_OPTIONS = [70, 80, 85, 90];

export default async function TastingsPage({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string;
    buy?: string;
    sort?: string;
    aroma?: string | string[];
    min?: string;
  }>;
}) {
  const { q, buy, sort, aroma, min } = await searchParams;
  const selectedTagIds = (Array.isArray(aroma) ? aroma : aroma ? [aroma] : [])
    .map(Number)
    .filter(Number.isInteger);
  const minScore = min && MIN_SCORE_OPTIONS.includes(Number(min)) ? Number(min) : null;

  const supabase = await createClient();

  let query = supabase
    .from('tastings')
    .select('*, whiskies!inner(*)')
    .order('tasted_at', { ascending: false })
    .order('created_at', { ascending: false });
  if (q) query = query.ilike('whiskies.name', `%${q}%`);
  if (buy && buy in BUY_AGAIN_LABELS) query = query.eq('would_buy_again', buy);

  const [tastingsRes, tagsRes, tastingAromasRes] = await Promise.all([
    query,
    supabase.from('aroma_tags').select('*').order('id'),
    supabase.from('tasting_aromas').select('tasting_id, tag_id'),
  ]);

  let tastings = (tastingsRes.data ?? []) as TastingWithWhisky[];
  const aromaTags = (tagsRes.data ?? []) as AromaTag[];
  const aromaRows = (tastingAromasRes.data ?? []) as { tasting_id: string; tag_id: number }[];

  const scoreOf = (t: TastingWithWhisky) =>
    t.overall_score ?? averageScore(t.nose_score, t.palate_score, t.finish_score);

  // 아로마 취향 검색 — 선택한 태그를 모두 포함(AND)하는 노트만
  if (selectedTagIds.length > 0) {
    const tagsByTasting = new Map<string, Set<number>>();
    for (const row of aromaRows) {
      const set = tagsByTasting.get(row.tasting_id) ?? new Set<number>();
      set.add(row.tag_id);
      tagsByTasting.set(row.tasting_id, set);
    }
    tastings = tastings.filter((t) => {
      const tagSet = tagsByTasting.get(t.id);
      return tagSet != null && selectedTagIds.every((id) => tagSet.has(id));
    });
  }
  if (minScore != null) {
    tastings = tastings.filter((t) => (scoreOf(t) ?? -1) >= minScore);
  }
  if (sort === 'score') {
    tastings = [...tastings].sort((a, b) => (scoreOf(b) ?? -1) - (scoreOf(a) ?? -1));
  }

  const tasteFilterActive = selectedTagIds.length > 0 || minScore != null;
  const hasFilter = Boolean(q || buy || sort) || tasteFilterActive;

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

      <form className="mb-6">
        <div className="flex flex-wrap gap-2">
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
          <select
            name="sort"
            defaultValue={sort ?? ''}
            className={`${inputClass} rounded-full w-28`}
          >
            <option value="">최신순</option>
            <option value="score">점수순</option>
          </select>
          <button
            type="submit"
            className="h-11 px-5 rounded-full bg-accent text-on-accent text-sm font-semibold shrink-0"
          >
            적용
          </button>
        </div>

        <details className="mt-3" open={tasteFilterActive}>
          <summary className="text-sm text-muted cursor-pointer select-none">
            아로마 · 점수로 찾기
            {tasteFilterActive && <span className="text-accent-bright"> (적용 중)</span>}
          </summary>
          <div className="mt-4 space-y-4 bg-tile-1 border border-hairline rounded-(--radius-card) p-4">
            <div>
              <p className="text-sm text-muted mb-2">
                최소 점수 <span className="text-faint text-xs">(선택한 태그를 모두 느낀 노트만 검색됩니다)</span>
              </p>
              <div className="flex gap-2">
                <label className="inline-flex items-center h-9 px-4 rounded-full border border-hairline text-sm text-muted cursor-pointer select-none has-checked:border-accent has-checked:text-accent-bright has-checked:bg-accent/10">
                  <input
                    type="radio"
                    name="min"
                    value=""
                    defaultChecked={minScore == null}
                    className="sr-only"
                  />
                  전체
                </label>
                {MIN_SCORE_OPTIONS.map((score) => (
                  <label
                    key={score}
                    className="inline-flex items-center h-9 px-4 rounded-full border border-hairline text-sm text-muted cursor-pointer select-none has-checked:border-accent has-checked:text-accent-bright has-checked:bg-accent/10"
                  >
                    <input
                      type="radio"
                      name="min"
                      value={score}
                      defaultChecked={minScore === score}
                      className="sr-only"
                    />
                    {score}+
                  </label>
                ))}
              </div>
            </div>
            {AROMA_GROUPS.map((grp) => {
              const tags = aromaTags.filter((t) => t.grp === grp);
              if (tags.length === 0) return null;
              return (
                <div key={grp}>
                  <p className="text-xs text-faint mb-2">{AROMA_GROUP_LABELS[grp]}</p>
                  <div className="flex flex-wrap gap-2">
                    {tags.map((tag) => (
                      <label
                        key={tag.id}
                        className="inline-flex items-center h-9 px-3.5 rounded-full border border-hairline text-sm text-muted cursor-pointer select-none has-checked:border-accent has-checked:text-accent-bright has-checked:bg-accent/10"
                      >
                        <input
                          type="checkbox"
                          name="aroma"
                          value={tag.id}
                          defaultChecked={selectedTagIds.includes(tag.id)}
                          className="sr-only"
                        />
                        {tag.name}
                      </label>
                    ))}
                  </div>
                </div>
              );
            })}
            <div className="flex items-center gap-4">
              <button
                type="submit"
                className="h-10 px-6 rounded-full bg-accent text-on-accent text-sm font-semibold"
              >
                이 취향으로 검색
              </button>
              {tasteFilterActive && (
                <Link href="/tastings" className="text-sm text-muted underline underline-offset-4">
                  필터 초기화
                </Link>
              )}
            </div>
          </div>
        </details>
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
