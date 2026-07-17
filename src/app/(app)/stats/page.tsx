import { createClient } from '@/lib/supabase/server';
import { AromaRadar, MonthlyBars } from '@/components/charts';
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
  tasted_at: string;
  price_paid: number | null;
  nose_score: number | null;
  palate_score: number | null;
  finish_score: number | null;
  overall_score: number | null;
  whiskies: { category: Category } | null;
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
        'tasted_at, price_paid, nose_score, palate_score, finish_score, overall_score, whiskies(category)'
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

      <section className="grid grid-cols-3 gap-3">
        <Card className="text-center !p-4">
          <p className="font-display text-[22px] md:text-[26px] tabular-nums">
            {formatKrw(totalSpend)}
          </p>
          <p className="text-xs text-muted mt-1">총 지출</p>
        </Card>
        <Card className="text-center !p-4">
          <p className="font-display text-[22px] md:text-[26px] tabular-nums">
            {formatKrw(Math.round(cabinetValue))}
          </p>
          <p className="text-xs text-muted mt-1">캐비닛 잔여 가치</p>
        </Card>
        <Card className="text-center !p-4">
          <p
            className={`font-display text-[22px] md:text-[26px] tabular-nums ${scoreTextClass(avgAll)}`}
          >
            {avgAll ?? '—'}
          </p>
          <p className="text-xs text-muted mt-1">평균 점수</p>
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
