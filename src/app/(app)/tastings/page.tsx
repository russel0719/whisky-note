import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { EmptyState, LinkCard, PageHeader, ScoreFigure } from '@/components/ui';
import { inputClass } from '@/components/form';
import { formatDate, tastingDescriptors } from '@/lib/format';
import {
  AROMA_GROUPS,
  AROMA_GROUP_LABELS,
  BUY_AGAIN_LABELS,
  SERVES,
  type AromaTag,
  type BuyAgain,
  type Serve,
  type TastingWithWhisky,
} from '@/lib/types';

export const metadata = { title: '시음 노트' };

const MIN_SCORE_OPTIONS = [70, 80, 85, 90];

const PAGE_SIZE = 30;

/** 본문 검색 대상 컬럼 (위스키 이름은 별도로 id 조회 후 합친다) */
const TEXT_COLUMNS = ['comment', 'location', 'pairing', 'nose_note', 'palate_note', 'finish_note'];

/** PostgREST or() 문법·LIKE 와일드카드에 쓰이는 문자를 제거 */
function cleanSearch(q: string | undefined): string {
  return (q ?? '')
    .replace(/[%_*,()"\\]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export default async function TastingsPage({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string;
    buy?: string;
    sort?: string;
    aroma?: string | string[];
    min?: string;
    serve?: string;
    page?: string;
  }>;
}) {
  const params = await searchParams;
  const { q, buy, sort, aroma, min, serve, page } = params;
  const selectedTagIds = (Array.isArray(aroma) ? aroma : aroma ? [aroma] : [])
    .map(Number)
    .filter(Number.isInteger);
  const minScore = min && MIN_SCORE_OPTIONS.includes(Number(min)) ? Number(min) : null;
  const serveFilter = serve && serve in SERVES ? (serve as Serve) : null;
  const pageNum = Math.max(1, Math.floor(Number(page)) || 1);
  const search = cleanSearch(q);

  const supabase = await createClient();

  const [tagsRes, aromaMatchRes, whiskyMatchRes] = await Promise.all([
    supabase.from('aroma_tags').select('*').order('id'),
    selectedTagIds.length > 0
      ? supabase.from('tasting_aromas').select('tasting_id, tag_id').in('tag_id', selectedTagIds)
      : Promise.resolve({ data: null }),
    search
      ? supabase.from('whiskies').select('id').ilike('name', `%${search}%`)
      : Promise.resolve({ data: null }),
  ]);
  const aromaTags = (tagsRes.data ?? []) as AromaTag[];

  // 아로마 취향 검색 — 선택한 태그를 모두 포함(AND, 단계 무관)하는 노트 id
  let aromaIds: string[] | null = null;
  if (aromaMatchRes.data) {
    const tagsByTasting = new Map<string, Set<number>>();
    for (const row of aromaMatchRes.data as { tasting_id: string; tag_id: number }[]) {
      const set = tagsByTasting.get(row.tasting_id) ?? new Set<number>();
      set.add(row.tag_id);
      tagsByTasting.set(row.tasting_id, set);
    }
    aromaIds = [...tagsByTasting.entries()]
      .filter(([, set]) => selectedTagIds.every((id) => set.has(id)))
      .map(([id]) => id);
  }

  let tastings: TastingWithWhisky[] = [];
  let total = 0;
  if (aromaIds == null || aromaIds.length > 0) {
    let query = supabase.from('tastings').select('*, whiskies!inner(*)', { count: 'exact' });
    if (search) {
      const filters = TEXT_COLUMNS.map((col) => `${col}.ilike.%${search}%`);
      const whiskyIds = ((whiskyMatchRes.data ?? []) as { id: string }[]).map((w) => w.id);
      if (whiskyIds.length > 0) filters.push(`whisky_id.in.(${whiskyIds.join(',')})`);
      query = query.or(filters.join(','));
    }
    if (buy && buy in BUY_AGAIN_LABELS) query = query.eq('would_buy_again', buy);
    if (serveFilter) query = query.eq('serve', serveFilter);
    if (minScore != null) query = query.gte('score', minScore);
    if (aromaIds) query = query.in('id', aromaIds);
    query =
      sort === 'score'
        ? query.order('score', { ascending: false, nullsFirst: false })
        : query.order('tasted_at', { ascending: false });
    query = query
      .order('created_at', { ascending: false })
      .range((pageNum - 1) * PAGE_SIZE, pageNum * PAGE_SIZE - 1);

    const { data, count } = await query;
    tastings = (data ?? []) as TastingWithWhisky[];
    total = count ?? 0;
  }
  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const pageHref = (n: number) => {
    const sp = new URLSearchParams();
    for (const [key, value] of Object.entries(params)) {
      if (key === 'page' || value == null) continue;
      for (const v of Array.isArray(value) ? value : [value]) if (v) sp.append(key, v);
    }
    if (n > 1) sp.set('page', String(n));
    const qs = sp.toString();
    return qs ? `/tastings?${qs}` : '/tastings';
  };

  const tasteFilterActive = selectedTagIds.length > 0 || minScore != null;
  const hasFilter = Boolean(q || buy || sort || serveFilter) || tasteFilterActive;

  return (
    <div>
      <PageHeader
        eyebrow="Notes"
        title="시음 노트"
        action={
          <div className="flex gap-2">
            <Link
              href="/flights"
              className="h-10 px-4 inline-flex items-center rounded-full border border-hairline text-muted text-sm"
            >
              플라이트
            </Link>
            <Link
              href="/tastings/new"
              className="h-10 px-4 inline-flex items-center rounded-full border border-accent text-accent-bright text-sm"
            >
              + 작성
            </Link>
          </div>
        }
      />

      <form className="mb-6">
        <div className="flex flex-wrap gap-2">
          <input
            type="search"
            name="q"
            defaultValue={q ?? ''}
            placeholder="위스키 · 총평 · 장소 검색"
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
            name="serve"
            defaultValue={serveFilter ?? ''}
            className={`${inputClass} rounded-full w-28`}
          >
            <option value="">방식 전체</option>
            {(Object.keys(SERVES) as Serve[]).map((key) => (
              <option key={key} value={key}>
                {SERVES[key]}
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
                최소 점수{' '}
                <span className="text-faint text-xs">
                  (선택한 태그를 모두 느낀 노트만 검색됩니다)
                </span>
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
                  {(() => {
                    const summary = tasting.comment ?? tastingDescriptors(tasting);
                    return summary ? ` · ${summary}` : '';
                  })()}
                </p>
              </div>
              <ScoreFigure value={tasting.score} />
            </LinkCard>
          ))}
          <div className="flex items-center justify-between pt-3 text-sm text-muted">
            <span className="tabular-nums">
              {total}개{pageCount > 1 ? ` · ${pageNum}/${pageCount} 페이지` : ''}
            </span>
            <div className="flex gap-2">
              {pageNum > 1 && (
                <Link
                  href={pageHref(pageNum - 1)}
                  className="h-9 px-4 inline-flex items-center rounded-full border border-hairline"
                >
                  이전
                </Link>
              )}
              {pageNum < pageCount && (
                <Link
                  href={pageHref(pageNum + 1)}
                  className="h-9 px-4 inline-flex items-center rounded-full border border-accent text-accent-bright"
                >
                  다음
                </Link>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
