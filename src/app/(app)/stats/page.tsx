import { createClient } from '@/lib/supabase/server';
import { AromaRadar, MonthlyBars, PriceScatter } from '@/components/charts';
import { Card, EmptyState, PageHeader, scoreTextClass, SectionTitle } from '@/components/ui';
import { averageScore, formatKrw } from '@/lib/format';
import {
  AROMA_GROUP_LABELS,
  CATEGORY_LABELS,
  type AromaGroup,
  type Bottle,
  type Category,
} from '@/lib/types';

export const metadata = { title: '통계' };

interface TastingRow {
  id: string;
  bottle_id: string | null;
  tasted_at: string;
  price_paid: number | null;
  nose_score: number | null;
  palate_score: number | null;
  finish_score: number | null;
  overall_score: number | null;
  whiskies: { name: string; category: Category } | null;
}

function monthKey(iso: string): string {
  return iso.slice(0, 7);
}

export default async function StatsPage() {
  const supabase = await createClient();

  const [tastingsRes, bottlesRes, aromaRes] = await Promise.all([
    supabase
      .from('tastings')
      .select(
        'id, bottle_id, tasted_at, price_paid, nose_score, palate_score, finish_score, overall_score, whiskies(name, category)'
      ),
    supabase.from('bottles').select('*'),
    supabase.from('tasting_aromas').select('aroma_tags(grp)'),
  ]);

  const tastings = (tastingsRes.data ?? []) as unknown as TastingRow[];
  const bottles = (bottlesRes.data ?? []) as Bottle[];
  const aromaRows = (aromaRes.data ?? []) as unknown as { aroma_tags: { grp: AromaGroup } | null }[];

  if (tastings.length === 0 && bottles.length === 0) {
    return (
      <div>
        <PageHeader eyebrow="Insights" title="통계" />
        <EmptyState
          message="기록이 쌓이면 취향 프로필과 지출 분석이 여기에 나타납니다."
          ctaHref="/tastings/new"
          ctaLabel="첫 노트 작성"
        />
      </div>
    );
  }

  const scoreOf = (t: TastingRow) =>
    t.overall_score ?? averageScore(t.nose_score, t.palate_score, t.finish_score);

  // 아로마 프로필 (9그룹)
  const groupCounts = new Map<AromaGroup, number>();
  for (const row of aromaRows) {
    const grp = row.aroma_tags?.grp;
    if (grp) groupCounts.set(grp, (groupCounts.get(grp) ?? 0) + 1);
  }
  const radarData = (Object.keys(AROMA_GROUP_LABELS) as AromaGroup[]).map((grp) => ({
    label: AROMA_GROUP_LABELS[grp],
    value: groupCounts.get(grp) ?? 0,
  }));
  const hasAroma = radarData.some((d) => d.value > 0);

  // 분류별 평균 점수
  const byCategory = new Map<Category, number[]>();
  for (const t of tastings) {
    const category = t.whiskies?.category;
    const score = scoreOf(t);
    if (!category || score == null) continue;
    byCategory.set(category, [...(byCategory.get(category) ?? []), score]);
  }
  const categoryStats = [...byCategory.entries()]
    .map(([category, scores]) => ({
      category,
      avg: Math.round(scores.reduce((a, b) => a + b, 0) / scores.length),
      count: scores.length,
    }))
    .sort((a, b) => b.avg - a.avg);

  // 월별 지출/시음 (최근 12개월)
  const now = new Date();
  const months: string[] = [];
  for (let i = 11; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    months.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
  }
  const spendByMonth = new Map<string, number>(months.map((m) => [m, 0]));
  const countByMonth = new Map<string, number>(months.map((m) => [m, 0]));
  for (const b of bottles) {
    const key = monthKey(b.purchase_date);
    if (spendByMonth.has(key) && b.purchase_price) {
      spendByMonth.set(key, (spendByMonth.get(key) ?? 0) + b.purchase_price);
    }
  }
  for (const t of tastings) {
    const key = monthKey(t.tasted_at);
    if (t.price_paid && spendByMonth.has(key)) {
      spendByMonth.set(key, (spendByMonth.get(key) ?? 0) + t.price_paid);
    }
    if (countByMonth.has(key)) countByMonth.set(key, (countByMonth.get(key) ?? 0) + 1);
  }
  const monthLabel = (m: string) => `${Number(m.slice(5, 7))}월`;
  const spendData = months.map((m) => ({
    label: monthLabel(m),
    value: spendByMonth.get(m) ?? 0,
    title: `${m}: ${formatKrw(spendByMonth.get(m) ?? 0)}`,
  }));
  const countData = months.map((m) => ({
    label: monthLabel(m),
    value: countByMonth.get(m) ?? 0,
    title: `${m}: ${countByMonth.get(m) ?? 0}회`,
  }));

  // 가격 × 만족도 — 보틀 시음은 잔당(30ml) 환산 가격, 바 시음은 잔 가격
  const bottleById = new Map(bottles.map((b) => [b.id, b]));
  type ScatterPoint = { price: number; score: number; label: string; kind: 'bottle' | 'bar' };
  const scatterPoints = tastings.flatMap((t): ScatterPoint[] => {
    const score = scoreOf(t);
    if (score == null) return [];
    const label = t.whiskies?.name ?? '이름 없음';
    if (t.bottle_id) {
      const bottle = bottleById.get(t.bottle_id);
      if (bottle?.purchase_price && bottle.size_ml > 0) {
        return [
          {
            price: bottle.purchase_price / (bottle.size_ml / 30),
            score,
            label,
            kind: 'bottle' as const,
          },
        ];
      }
      return [];
    }
    if (t.price_paid) return [{ price: t.price_paid, score, label, kind: 'bar' as const }];
    return [];
  });

  // 요약
  const totalSpend =
    bottles.reduce((sum, b) => sum + (b.purchase_price ?? 0), 0) +
    tastings.reduce((sum, t) => sum + (t.price_paid ?? 0), 0);
  const cabinetValue = bottles
    .filter((b) => b.status !== 'finished')
    .reduce((sum, b) => sum + ((b.purchase_price ?? 0) * b.remaining_pct) / 100, 0);
  const allScores = tastings.map(scoreOf).filter((s): s is number => s != null);
  const avgAll = allScores.length
    ? Math.round(allScores.reduce((a, b) => a + b, 0) / allScores.length)
    : null;

  return (
    <div className="space-y-10">
      <PageHeader eyebrow="Insights" title="통계" />

      <section className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Card className="!p-4 flex sm:flex-col items-baseline sm:items-center justify-between sm:justify-center sm:text-center gap-1">
          <p className="text-xs text-muted sm:order-2 sm:mt-1 shrink-0">총 지출</p>
          <p className="font-display text-[22px] md:text-[26px] tabular-nums sm:order-1">
            {formatKrw(totalSpend)}
          </p>
        </Card>
        <Card className="!p-4 flex sm:flex-col items-baseline sm:items-center justify-between sm:justify-center sm:text-center gap-1">
          <p className="text-xs text-muted sm:order-2 sm:mt-1 shrink-0">캐비닛 잔여 가치</p>
          <p className="font-display text-[22px] md:text-[26px] tabular-nums sm:order-1">
            {formatKrw(Math.round(cabinetValue))}
          </p>
        </Card>
        <Card className="!p-4 flex sm:flex-col items-baseline sm:items-center justify-between sm:justify-center sm:text-center gap-1">
          <p className="text-xs text-muted sm:order-2 sm:mt-1 shrink-0">평균 점수</p>
          <p
            className={`font-display text-[22px] md:text-[26px] tabular-nums sm:order-1 ${scoreTextClass(avgAll)}`}
          >
            {avgAll ?? '—'}
          </p>
        </Card>
      </section>

      <div className="grid gap-10 md:grid-cols-2 md:gap-8">
        {hasAroma && (
          <section>
            <SectionTitle>아로마 프로필</SectionTitle>
            <Card>
              <AromaRadar data={radarData} />
            </Card>
          </section>
        )}

        {categoryStats.length > 0 && (
          <section>
            <SectionTitle>분류별 평균 점수</SectionTitle>
            <Card className="space-y-3">
              {categoryStats.map(({ category, avg, count }) => (
                <div key={category} className="flex items-center gap-3">
                  <span className="text-sm text-muted w-24 shrink-0">
                    {CATEGORY_LABELS[category]}
                  </span>
                  <div className="flex-1 h-2 rounded-full bg-tile-2 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-accent"
                      style={{ width: `${avg}%` }}
                      title={`${CATEGORY_LABELS[category]}: 평균 ${avg}점 (${count}회)`}
                    />
                  </div>
                  <span className={`text-sm tabular-nums w-8 text-right ${scoreTextClass(avg)}`}>
                    {avg}
                  </span>
                  <span className="text-xs text-faint tabular-nums w-8 text-right">
                    {count}회
                  </span>
                </div>
              ))}
            </Card>
          </section>
        )}
      </div>

      {scatterPoints.length >= 2 && (
        <section>
          <SectionTitle>가격 × 만족도</SectionTitle>
          <Card>
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs text-muted">잔당 가격(30ml 환산) 대비 점수</p>
              <div className="flex items-center gap-4 text-xs text-muted">
                <span className="inline-flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-accent-bright" /> 보틀
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full border-2 border-accent-bright" /> 바
                </span>
              </div>
            </div>
            <PriceScatter points={scatterPoints} />
          </Card>
        </section>
      )}

      <section>
        <SectionTitle>월별 지출</SectionTitle>
        <Card>
          <MonthlyBars data={spendData} format={(v) => formatKrw(v)} />
        </Card>
      </section>

      <section>
        <SectionTitle>월별 시음 횟수</SectionTitle>
        <Card>
          <MonthlyBars data={countData} format={(v) => `${v}회`} />
        </Card>
      </section>
    </div>
  );
}
