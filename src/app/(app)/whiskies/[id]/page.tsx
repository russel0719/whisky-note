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
import { OpenAgeChart, Sparkline } from '@/components/charts';
import { averageScore, daysSinceOpen, formatDate, formatKrw, formatOpenAge } from '@/lib/format';
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

  const scoreOf = (t: Tasting) =>
    t.overall_score ?? averageScore(t.nose_score, t.palate_score, t.finish_score);
  const scores = tastings.map(scoreOf).filter((s): s is number => s != null);
  const avg = scores.length ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : null;

  // 오래된 → 최신 순 점수 추이
  const chronological = [...tastings].reverse();
  const trend = chronological.map(scoreOf).filter((s): s is number => s != null);

  // 개봉일이 있는 보틀별 "개봉 경과 × 점수" 시리즈 (시음 2회 이상)
  const openAgeSeries = bottles
    .filter((b) => b.open_date)
    .map((bottle) => ({
      bottle,
      points: chronological
        .filter((t) => t.bottle_id === bottle.id)
        .flatMap((t) => {
          const days = daysSinceOpen(bottle.open_date, t.tasted_at);
          const score = scoreOf(t);
          return days != null && score != null
            ? [{ days, score, date: formatDate(t.tasted_at) }]
            : [];
        }),
    }))
    .filter((s) => s.points.length >= 2);

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

      {whisky.image_url && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={whisky.image_url}
          alt={whisky.name}
          className="w-full max-h-72 object-cover rounded-(--radius-card) border border-hairline"
        />
      )}

      <div className="flex flex-wrap gap-3">
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
        <Link
          href={`/whiskies/${whisky.id}/edit`}
          className="h-10 px-5 inline-flex items-center rounded-full border border-hairline text-muted text-sm"
        >
          수정
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

      {openAgeSeries.length > 0 && (
        <section>
          <SectionTitle>개봉 경과에 따른 점수</SectionTitle>
          <div className="space-y-4">
            {openAgeSeries.map(({ bottle, points }) => (
              <Card key={bottle.id}>
                <p className="text-sm text-muted mb-2">
                  {formatDate(bottle.purchase_date)} 구매 보틀
                </p>
                <OpenAgeChart points={points} />
              </Card>
            ))}
          </div>
        </section>
      )}

      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-[21px] font-semibold">
            시음 이력 {tastings.length > 0 && `(${tastings.length})`}
          </h2>
          {trend.length >= 2 && <Sparkline values={trend} />}
        </div>
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
