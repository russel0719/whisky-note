import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { Card, CategoryBadge, EmptyState } from '@/components/ui';
import { inputClass } from '@/components/form';
import { CATEGORIES, CATEGORY_LABELS, type Category, type Whisky } from '@/lib/types';

export const metadata = { title: '위스키' };

export default async function WhiskiesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; category?: string }>;
}) {
  const { q, category } = await searchParams;
  const supabase = await createClient();

  let query = supabase.from('whiskies').select('*').order('name');
  if (q) query = query.ilike('name', `%${q}%`);
  if (category && CATEGORIES.includes(category as Category)) {
    query = query.eq('category', category);
  }
  const { data } = await query;
  const whiskies = (data ?? []) as Whisky[];

  return (
    <div>
      <header className="flex items-end justify-between mb-6">
        <div>
          <p className="text-accent text-sm tracking-[0.25em] uppercase mb-2">Collection</p>
          <h1 className="text-[28px]">위스키</h1>
        </div>
        <Link
          href="/whiskies/new"
          className="h-10 px-4 inline-flex items-center rounded-full border border-accent text-accent-bright text-sm"
        >
          + 등록
        </Link>
      </header>

      <form className="flex gap-2 mb-6">
        <input
          type="search"
          name="q"
          defaultValue={q ?? ''}
          placeholder="이름 검색"
          className={`${inputClass} rounded-full flex-1`}
        />
        <select name="category" defaultValue={category ?? ''} className={`${inputClass} rounded-full w-36`}>
          <option value="">전체 분류</option>
          {CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {CATEGORY_LABELS[c]}
            </option>
          ))}
        </select>
        <button
          type="submit"
          className="h-11 px-5 rounded-full bg-accent text-on-accent text-sm font-semibold shrink-0"
        >
          검색
        </button>
      </form>

      {whiskies.length === 0 ? (
        <EmptyState
          message={q || category ? '조건에 맞는 위스키가 없습니다.' : '아직 등록된 위스키가 없습니다.'}
          ctaHref="/whiskies/new"
          ctaLabel="첫 위스키 등록"
        />
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {whiskies.map((whisky) => (
            <Link key={whisky.id} href={`/whiskies/${whisky.id}`} className="block">
              <Card className="h-full">
                <div className="flex items-start justify-between gap-3">
                  <p className="font-semibold">{whisky.name}</p>
                  <CategoryBadge category={whisky.category} />
                </div>
                <p className="text-sm text-muted mt-1.5">
                  {[
                    whisky.distillery,
                    whisky.region,
                    whisky.age_years ? `${whisky.age_years}년` : null,
                    whisky.abv ? `${whisky.abv}%` : null,
                  ]
                    .filter(Boolean)
                    .join(' · ') || '상세 정보 없음'}
                </p>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
