import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { Card, EmptyState, PageHeader, SectionTitle } from '@/components/ui';
import { ConfirmForm } from '@/components/confirm-form';
import { formatDate } from '@/lib/format';
import { addWishlistFromWhisky, removeWishlist } from './actions';
import { WishlistAdd } from './wishlist-add';

export const metadata = { title: '위시리스트' };

interface WishlistRow {
  id: string;
  name: string;
  note: string | null;
  catalog_id: string | null;
  whisky_id: string | null;
  created_at: string;
}

export default async function WishlistPage() {
  const supabase = await createClient();

  const [wishlistRes, whiskiesRes, bottlesRes, buyAgainRes] = await Promise.all([
    supabase.from('wishlist').select('*').order('created_at', { ascending: false }),
    supabase.from('whiskies').select('id, catalog_id'),
    supabase.from('bottles').select('whisky_id').neq('status', 'finished'),
    supabase.from('tastings').select('whisky_id, whiskies(name)').eq('would_buy_again', 'yes'),
  ]);

  const items = (wishlistRes.data ?? []) as WishlistRow[];
  const whiskies = (whiskiesRes.data ?? []) as { id: string; catalog_id: string | null }[];
  const ownedWhiskyIds = new Set(
    ((bottlesRes.data ?? []) as { whisky_id: string }[]).map((b) => b.whisky_id)
  );
  const whiskyByCatalog = new Map(
    whiskies.filter((w) => w.catalog_id).map((w) => [w.catalog_id!, w.id])
  );

  /** 위시 항목에 해당하는 내 위스키 id (직접 연결 또는 같은 카탈로그 항목) */
  const linkedWhiskyId = (item: WishlistRow) =>
    item.whisky_id ?? (item.catalog_id ? whiskyByCatalog.get(item.catalog_id) : undefined);

  // 후보: "재구매" 표시한 시음이 있지만 가진 보틀이 없고 위시리스트에도 없는 위스키
  const wishedWhiskyIds = new Set(items.map(linkedWhiskyId).filter(Boolean));
  const candidates = new Map<string, string>();
  for (const row of (buyAgainRes.data ?? []) as unknown as {
    whisky_id: string;
    whiskies: { name: string } | null;
  }[]) {
    if (ownedWhiskyIds.has(row.whisky_id) || wishedWhiskyIds.has(row.whisky_id)) continue;
    if (row.whiskies) candidates.set(row.whisky_id, row.whiskies.name);
  }

  return (
    <div className="space-y-10">
      <PageHeader eyebrow="Wishlist" title="위시리스트" />

      <section>
        <SectionTitle>추가</SectionTitle>
        <WishlistAdd />
      </section>

      {candidates.size > 0 && (
        <section>
          <SectionTitle>재구매하고 싶다고 한 위스키</SectionTitle>
          <div className="space-y-2">
            {[...candidates.entries()].map(([whiskyId, name]) => (
              <Card key={whiskyId} className="!p-4 flex items-center justify-between gap-3">
                <Link href={`/whiskies/${whiskyId}`} className="font-semibold truncate">
                  {name}
                </Link>
                <form action={addWishlistFromWhisky} className="shrink-0">
                  <input type="hidden" name="whisky_id" value={whiskyId} />
                  <button
                    type="submit"
                    className="h-9 px-3.5 rounded-full border border-accent text-accent-bright text-sm"
                  >
                    + 위시
                  </button>
                </form>
              </Card>
            ))}
          </div>
        </section>
      )}

      <section>
        <SectionTitle>목록 {items.length > 0 && `(${items.length})`}</SectionTitle>
        {items.length === 0 ? (
          <EmptyState
            message="마셔보고 싶은 위스키를 담아두세요. 통계의 취향 기반 추천에서도 추가할 수 있습니다."
            ctaHref="/stats"
            ctaLabel="추천 보기"
          />
        ) : (
          <div className="space-y-3">
            {items.map((item) => {
              const whiskyId = linkedWhiskyId(item);
              const tastingHref = whiskyId
                ? `/tastings/new?whisky=${whiskyId}`
                : item.catalog_id
                  ? `/tastings/new?catalog=${item.catalog_id}`
                  : '/tastings/new';
              return (
                <Card key={item.id}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      {whiskyId ? (
                        <Link
                          href={`/whiskies/${whiskyId}`}
                          className="font-semibold hover:text-accent-bright"
                        >
                          {item.name}
                        </Link>
                      ) : (
                        <p className="font-semibold">{item.name}</p>
                      )}
                      <p className="text-xs text-faint mt-0.5">
                        {formatDate(item.created_at)} 추가
                      </p>
                      {item.note && <p className="text-sm text-muted mt-1.5">{item.note}</p>}
                    </div>
                    {whiskyId && ownedWhiskyIds.has(whiskyId) && (
                      <span className="shrink-0 inline-flex items-center h-7 px-2.5 rounded-full border border-accent/40 text-xs text-accent-bright">
                        보유 중
                      </span>
                    )}
                  </div>
                  <div className="flex flex-wrap items-center justify-between gap-3 mt-4 pt-3 border-t border-hairline-soft">
                    <div className="flex flex-wrap gap-2">
                      <Link
                        href={tastingHref}
                        className="h-9 px-4 inline-flex items-center rounded-full border border-accent text-accent-bright text-sm"
                      >
                        마셔봤어요
                      </Link>
                      {whiskyId && (
                        <Link
                          href={`/bottles/new?whisky=${whiskyId}`}
                          className="h-9 px-4 inline-flex items-center rounded-full border border-hairline text-muted text-sm"
                        >
                          샀어요
                        </Link>
                      )}
                    </div>
                    <ConfirmForm action={removeWishlist} message="위시리스트에서 뺄까요?">
                      <input type="hidden" name="id" value={item.id} />
                      <button type="submit" className="text-sm text-muted">
                        빼기
                      </button>
                    </ConfirmForm>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
