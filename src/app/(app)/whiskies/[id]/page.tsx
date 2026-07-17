import Link from 'next/link';
import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import {
  Card,
  CategoryBadge,
  Eyebrow,
  LinkCard,
  RemainingBar,
  ScoreFigure,
  scoreTextClass,
  SectionTitle,
} from '@/components/ui';
import { averageScore, formatDate, formatKrw, formatOpenAge } from '@/lib/format';
import { BOTTLE_STATUS_LABELS, type Bottle, type Tasting, type Whisky } from '@/lib/types';
import { deleteWhisky } from '../actions';

export default async function WhiskyDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const [whiskyRes, bottlesRes, tastingsRes] = await Promise.all([
    supabase.from('whiskies').select('*').eq('id', id).maybeSingle(),
    supabase
      .from('bottles')
      .select('*')
      .eq('whisky_id', id)
      .order('purchase_date', { ascending: false }),
    supabase
      .from('tastings')
      .select('*')
      .eq('whisky_id', id)
      .order('tasted_at', { ascending: false }),
  ]);

  const whisky = whiskyRes.data as Whisky | null;
  if (!whisky) notFound();
  const bottles = (bottlesRes.data ?? []) as Bottle[];
  const tastings = (tastingsRes.data ?? []) as Tasting[];

  const scores = tastings
    .map((t) => t.overall_score ?? averageScore(t.nose_score, t.palate_score, t.finish_score))
    .filter((s): s is number => s != null);
  const avg = scores.length ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : null;

  return (
    <div className="space-y-10">
      <header>
        <div className="flex items-start justify-between gap-4">
          <div>
            <Eyebrow>Whisky</Eyebrow>
            <h1 className="font-display text-[30px] leading-tight">{whisky.name}</h1>
          </div>
          {avg != null && (
            <div className="text-right shrink-0">
              <p
                className={`font-display text-[36px] tabular-nums leading-none ${scoreTextClass(avg)}`}
              >
                {avg}
              </p>
              <p className="text-xs text-faint mt-1">평균 점수</p>
            </div>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2 mt-3 text-sm text-muted">
          <CategoryBadge category={whisky.category} />
          {[
            whisky.distillery,
            whisky.region,
            whisky.age_years ? `${whisky.age_years}년 숙성` : null,
            whisky.abv ? `${whisky.abv}%` : null,
            whisky.cask_type ? `${whisky.cask_type} 캐스크` : null,
          ]
            .filter(Boolean)
            .map((item) => (
              <span key={String(item)}>{item}</span>
            ))}
        </div>
      </header>

      <div className="flex gap-3">
        <Link
          href={`/tastings/new?whisky=${whisky.id}`}
          className="h-10 px-5 inline-flex items-center rounded-full bg-accent text-on-accent text-sm font-semibold"
        >
          시음 노트 작성
        </Link>
        <Link
          href={`/bottles/new?whisky=${whisky.id}`}
          className="h-10 px-5 inline-flex items-center rounded-full border border-accent text-accent-bright text-sm"
        >
          구매 기록 추가
        </Link>
      </div>

      <section>
        <SectionTitle>보틀 {bottles.length > 0 && `(${bottles.length})`}</SectionTitle>
        {bottles.length === 0 ? (
          <p className="text-muted text-sm">구매 기록이 없습니다.</p>
        ) : (
          <div className="space-y-3">
            {bottles.map((bottle) => (
              <Card key={bottle.id}>
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-sm">
                      <span className="font-semibold">{formatDate(bottle.purchase_date)}</span>{' '}
                      <span className="text-muted">
                        구매 · {formatKrw(bottle.purchase_price)}
                        {bottle.purchase_place ? ` · ${bottle.purchase_place}` : ''}
                      </span>
                    </p>
                    <p className="text-sm text-muted mt-1">
                      {BOTTLE_STATUS_LABELS[bottle.status]}
                      {bottle.status !== 'unopened' && formatOpenAge(bottle.open_date)
                        ? ` · ${formatOpenAge(bottle.open_date)}`
                        : ''}
                      {` · ${bottle.size_ml}ml`}
                    </p>
                  </div>
                  <p className="text-sm text-accent-bright tabular-nums shrink-0">
                    {bottle.remaining_pct}%
                  </p>
                </div>
                <div className="mt-3">
                  <RemainingBar pct={bottle.remaining_pct} />
                </div>
              </Card>
            ))}
          </div>
        )}
      </section>

      <section>
        <SectionTitle>시음 이력 {tastings.length > 0 && `(${tastings.length})`}</SectionTitle>
        {tastings.length === 0 ? (
          <p className="text-muted text-sm">아직 시음 노트가 없습니다.</p>
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
                    <p className="text-sm font-semibold">{formatDate(tasting.tasted_at)}</p>
                    <p className="text-sm text-muted mt-0.5 truncate">
                      {tasting.comment || tasting.palate_note || '노트 없음'}
                    </p>
                  </div>
                  <ScoreFigure value={score} />
                </LinkCard>
              );
            })}
          </div>
        )}
      </section>

      <form
        action={deleteWhisky}
        className="pt-4 border-t border-hairline-soft"
      >
        <input type="hidden" name="id" value={whisky.id} />
        <button type="submit" className="text-danger text-sm">
          이 위스키와 모든 기록 삭제
        </button>
      </form>
    </div>
  );
}
