import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { ScoreDial } from '@/components/charts';
import {
  Card,
  EmptyState,
  Eyebrow,
  LinkCard,
  RemainingBar,
  ScoreFigure,
  scoreTextClass,
  SectionTitle,
} from '@/components/ui';
import { averageScore, daysSinceOpen, formatDate, formatOpenAge } from '@/lib/format';
import type { BottleWithWhisky, TastingWithWhisky } from '@/lib/types';

export default async function DashboardPage() {
  const supabase = await createClient();

  const [recentRes, openRes, whiskyCountRes, tastingScoresRes, aromaRes] = await Promise.all([
    supabase
      .from('tastings')
      .select('*, whiskies(*)')
      .order('tasted_at', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(6),
    supabase
      .from('bottles')
      .select('*, whiskies(*)')
      .eq('status', 'open')
      .order('open_date', { ascending: true }),
    supabase.from('whiskies').select('*', { count: 'exact', head: true }),
    supabase
      .from('tastings')
      .select('nose_score, palate_score, finish_score, overall_score'),
    supabase.from('tasting_aromas').select('aroma_tags(name)'),
  ]);

  const recent = (recentRes.data ?? []) as TastingWithWhisky[];
  const openBottles = (openRes.data ?? []) as BottleWithWhisky[];
  const whiskyCount = whiskyCountRes.count ?? 0;
  const scores = tastingScoresRes.data ?? [];
  const tastingCount = scores.length;

  const scoreOf = (t: {
    nose_score: number | null;
    palate_score: number | null;
    finish_score: number | null;
    overall_score: number | null;
  }) => t.overall_score ?? averageScore(t.nose_score, t.palate_score, t.finish_score);

  const perTasting = scores.map(scoreOf).filter((s): s is number => s != null);
  const avgOverall =
    perTasting.length > 0
      ? Math.round(perTasting.reduce((a, b) => a + b, 0) / perTasting.length)
      : null;

  const aromaCounts = new Map<string, number>();
  for (const row of (aromaRes.data ?? []) as unknown as { aroma_tags: { name: string } | null }[]) {
    const name = row.aroma_tags?.name;
    if (name) aromaCounts.set(name, (aromaCounts.get(name) ?? 0) + 1);
  }
  const topAromas = [...aromaCounts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 6);

  const hero = recent[0];
  const rest = recent.slice(1);

  return (
    <div className="space-y-10">
      <header>
        <Eyebrow>Dashboard</Eyebrow>
        <h1 className="font-display text-[30px] md:text-[36px]">나의 위스키 기록</h1>
      </header>

      {hero ? (
        <Link href={`/tastings/${hero.id}`} className="block group">
          <section
            className="relative overflow-hidden bg-tile-2 border border-hairline rounded-(--radius-card) p-5 md:p-9 transition-colors group-hover:border-accent/30"
            style={{
              backgroundImage:
                'radial-gradient(ellipse 60% 80% at 85% 0%, rgba(201, 150, 63, 0.07), transparent)',
            }}
          >
            <div className="flex items-center justify-between gap-6">
              <div className="min-w-0">
                <Eyebrow>최근 시음 · {formatDate(hero.tasted_at)}</Eyebrow>
                <p className="font-display text-[26px] md:text-[32px] leading-tight truncate">
                  {hero.whiskies.name}
                </p>
                {(hero.comment || hero.location) && (
                  <p className="text-muted text-sm mt-2 line-clamp-2">
                    {hero.comment ?? hero.location}
                  </p>
                )}
              </div>
              <div className="shrink-0">
                <ScoreDial value={scoreOf(hero)} size={100} />
              </div>
            </div>
          </section>
        </Link>
      ) : (
        <EmptyState
          message="아직 시음 노트가 없습니다. 첫 잔의 기억을 남겨보세요."
          ctaHref="/tastings/new"
          ctaLabel="시음 노트 작성"
        />
      )}

      <section className="grid grid-cols-3 gap-3">
        <Card className="text-center !p-4">
          <p className="font-display text-[28px] tabular-nums">{tastingCount}</p>
          <p className="text-xs text-muted mt-1">시음 노트</p>
        </Card>
        <Card className="text-center !p-4">
          <p className="font-display text-[28px] tabular-nums">{whiskyCount}</p>
          <p className="text-xs text-muted mt-1">위스키</p>
        </Card>
        <Card className="text-center !p-4">
          <p className={`font-display text-[28px] tabular-nums ${scoreTextClass(avgOverall)}`}>
            {avgOverall ?? '—'}
          </p>
          <p className="text-xs text-muted mt-1">평균 점수</p>
        </Card>
      </section>

      <div className="grid gap-10 md:grid-cols-2 md:gap-8">
        <section>
          <SectionTitle>오픈 중인 보틀</SectionTitle>
          {openBottles.length === 0 ? (
            <EmptyState
              message="개봉 중인 보틀이 없습니다."
              ctaHref="/bottles/new"
              ctaLabel="구매 기록 추가"
            />
          ) : (
            <div className="space-y-3">
              {openBottles.map((bottle) => (
                <LinkCard key={bottle.id} href={`/whiskies/${bottle.whisky_id}`}>
                  <div className="min-w-0">
                    <p className="font-semibold truncate">{bottle.whiskies.name}</p>
                    <p className="text-sm text-muted mt-0.5">
                      {formatOpenAge(bottle.open_date) ?? '개봉일 미입력'} · 잔량{' '}
                      {bottle.remaining_pct}%
                    </p>
                    {(daysSinceOpen(bottle.open_date) ?? 0) > 180 && bottle.remaining_pct > 0 && (
                      <p className="text-xs text-accent-bright mt-1">
                        개봉 6개월 경과 — 산화가 진행됩니다. 마셔주세요
                      </p>
                    )}
                  </div>
                  <div className="mt-3">
                    <RemainingBar pct={bottle.remaining_pct} />
                  </div>
                </LinkCard>
              ))}
            </div>
          )}
        </section>

        <section>
          <SectionTitle>시음 노트</SectionTitle>
          {rest.length === 0 ? (
            <p className="text-muted text-sm">
              {hero ? '더 많은 노트가 쌓이면 여기에 표시됩니다.' : ''}
            </p>
          ) : (
            <div className="space-y-3">
              {rest.map((tasting) => (
                <LinkCard
                  key={tasting.id}
                  href={`/tastings/${tasting.id}`}
                  className="flex items-center justify-between gap-4"
                >
                  <div className="min-w-0">
                    <p className="font-semibold truncate">{tasting.whiskies.name}</p>
                    <p className="text-sm text-muted mt-0.5">{formatDate(tasting.tasted_at)}</p>
                  </div>
                  <ScoreFigure value={scoreOf(tasting)} />
                </LinkCard>
              ))}
            </div>
          )}
        </section>
      </div>

      {topAromas.length > 0 && (
        <section>
          <SectionTitle>자주 느낀 아로마</SectionTitle>
          <div className="flex flex-wrap gap-2">
            {topAromas.map(([name, count]) => (
              <span
                key={name}
                className="inline-flex items-center gap-1.5 h-8 px-3 rounded-full border border-hairline text-sm"
              >
                {name}
                <span className="text-faint text-xs tabular-nums">{count}</span>
              </span>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
