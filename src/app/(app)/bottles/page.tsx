import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { BottleGauge } from '@/components/charts';
import { Card, EmptyState, PageHeader, SectionTitle } from '@/components/ui';
import { formatDate, formatKrw, formatOpenAge } from '@/lib/format';
import type { BottleStatus, BottleWithWhisky } from '@/lib/types';
import { BottleControls } from './bottle-controls';

export const metadata = { title: '보틀' };

const SECTIONS: { status: BottleStatus; title: string }[] = [
  { status: 'open', title: '개봉 중' },
  { status: 'unopened', title: '미개봉' },
  { status: 'finished', title: '공병' },
];

export default async function BottlesPage() {
  const supabase = await createClient();
  const { data } = await supabase
    .from('bottles')
    .select('*, whiskies(*)')
    .order('purchase_date', { ascending: false });
  const bottles = (data ?? []) as BottleWithWhisky[];

  return (
    <div className="space-y-10">
      <PageHeader
        eyebrow="Cabinet"
        title="보틀"
        action={
          <Link
            href="/bottles/new"
            className="h-10 px-4 inline-flex items-center rounded-full border border-accent text-accent-bright text-sm"
          >
            + 구매 기록
          </Link>
        }
      />

      {bottles.length === 0 ? (
        <EmptyState
          message="아직 보틀 기록이 없습니다. 첫 구매를 기록해보세요."
          ctaHref="/bottles/new"
          ctaLabel="구매 기록 추가"
        />
      ) : (
        SECTIONS.map(({ status, title }) => {
          const group = bottles.filter((b) => b.status === status);
          if (group.length === 0) return null;
          return (
            <section key={status}>
              <SectionTitle>
                {title} ({group.length})
              </SectionTitle>
              <div className="space-y-3">
                {group.map((bottle) => (
                  <Card key={bottle.id}>
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0">
                        <Link
                          href={`/whiskies/${bottle.whisky_id}`}
                          className="font-semibold hover:text-accent-bright"
                        >
                          {bottle.whiskies.name}
                        </Link>
                        <p className="text-sm text-muted mt-1">
                          {formatDate(bottle.purchase_date)} 구매 ·{' '}
                          {formatKrw(bottle.purchase_price)} · {bottle.size_ml}ml
                          {bottle.purchase_place ? ` · ${bottle.purchase_place}` : ''}
                        </p>
                        {status === 'open' && (
                          <p className="text-sm text-accent-bright mt-0.5">
                            {formatOpenAge(bottle.open_date) ?? '개봉일 미입력'}
                          </p>
                        )}
                      </div>
                      <Link
                        href={`/bottles/${bottle.id}/edit`}
                        className="text-muted text-xs underline underline-offset-4 shrink-0"
                      >
                        수정
                      </Link>
                    </div>
                    {status === 'open' && (
                      <div className="flex items-center justify-between gap-3 mt-3">
                        <Link
                          href={`/tastings/new?whisky=${bottle.whisky_id}&bottle=${bottle.id}`}
                          className="h-9 px-4 inline-flex items-center rounded-full border border-accent text-accent-bright text-sm"
                        >
                          시음 기록
                        </Link>
                        <BottleGauge pct={bottle.remaining_pct} height={56} />
                      </div>
                    )}
                    <BottleControls bottle={bottle} />
                  </Card>
                ))}
              </div>
            </section>
          );
        })
      )}
    </div>
  );
}
