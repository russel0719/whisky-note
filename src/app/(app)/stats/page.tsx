import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { AromaRadar, MonthlyBars, PriceScatter } from '@/components/charts';
import {
  Card,
  EmptyState,
  PageHeader,
  ScoreBars,
  scoreTextClass,
  SectionTitle,
} from '@/components/ui';
import { formatKrw } from '@/lib/format';
import { averageBy, recommendFromCatalog, type LikedWhisky } from '@/lib/insights';
import {
  AROMA_GROUP_LABELS,
  CATEGORY_LABELS,
  PALATE_BODIES,
  SERVES,
  type AromaGroup,
  type Bottle,
  type CatalogEntry,
  type Category,
  type PalateBody,
  type Serve,
} from '@/lib/types';
import { addWishlistFromCatalog } from '../wishlist/actions';

export const metadata = { title: '통계' };

interface TastingRow {
  id: string;
  whisky_id: string;
  bottle_id: string | null;
  tasted_at: string;
  price_paid: number | null;
  score: number | null;
  serve: Serve | null;
  palate_body: PalateBody | null;
  whiskies: {
    name: string;
    category: Category;
    distillery: string | null;
    region: string | null;
    cask_type: string | null;
    catalog_id: string | null;
  } | null;
}

function monthKey(iso: string): string {
  return iso.slice(0, 7);
}

export default async function StatsPage() {
  const supabase = await createClient();

  const [tastingsRes, bottlesRes, aromaRes, catalogRes, myWhiskiesRes, wishlistRes] =
    await Promise.all([
      supabase
        .from('tastings')
        .select(
          'id, whisky_id, bottle_id, tasted_at, price_paid, score, serve, palate_body, whiskies(name, category, distillery, region, cask_type, catalog_id)'
        ),
      supabase.from('bottles').select('*'),
      supabase.from('tasting_aromas').select('tasting_id, tag_id, aroma_tags(grp)'),
      supabase.from('catalog').select('*'),
      supabase.from('whiskies').select('catalog_id').not('catalog_id', 'is', null),
      supabase.from('wishlist').select('catalog_id').not('catalog_id', 'is', null),
    ]);

  const tastings = (tastingsRes.data ?? []) as unknown as TastingRow[];
  const bottles = (bottlesRes.data ?? []) as Bottle[];
  const aromaRows = (aromaRes.data ?? []) as unknown as {
    tasting_id: string;
    tag_id: number;
    aroma_tags: { grp: AromaGroup } | null;
  }[];

  if (tastings.length === 0 && bottles.length === 0) {
    return (
      <div>
        <PageHeader eyebrow="Insights" title="통계" />
        <EmptyState
          message="기록이 쌓이면 취향 프로필과 지출 분석이 여기에 나타납니다."
          ctaHref="/tastings/new"
          ctaLabel="첫 노트 작성"
        />
        <p className="text-sm text-muted text-center mt-4">
          메모로 남긴 과거 기록이 있다면{' '}
          <Link href="/import" className="text-accent-bright underline underline-offset-4">
            가져오기
          </Link>
        </p>
      </div>
    );
  }

  const scoreOf = (t: TastingRow) => t.score;

  // 아로마 프로필 (9그룹)
  // 같은 노트에서 여러 단계에 고른 태그는 한 번만 센다
  const groupCounts = new Map<AromaGroup, number>();
  const seenAroma = new Set<string>();
  const tastingGroups: { tasting_id: string; grp: AromaGroup }[] = [];
  const seenGroup = new Set<string>();
  for (const row of aromaRows) {
    const grp = row.aroma_tags?.grp;
    const key = `${row.tasting_id}:${row.tag_id}`;
    if (!grp || seenAroma.has(key)) continue;
    seenAroma.add(key);
    groupCounts.set(grp, (groupCounts.get(grp) ?? 0) + 1);
    if (!seenGroup.has(`${row.tasting_id}:${grp}`)) {
      seenGroup.add(`${row.tasting_id}:${grp}`);
      tastingGroups.push({ tasting_id: row.tasting_id, grp });
    }
  }

  // 향 그룹별 평균 점수 — "어떤 향이 날 때 점수를 높게 줬나" (노트 2개 이상인 그룹만)
  const scoreByTasting = new Map(tastings.map((t) => [t.id, t.score]));
  const aromaScoreStats = averageBy(
    tastingGroups,
    (row) => row.grp,
    (row) => scoreByTasting.get(row.tasting_id),
    2
  );
  const radarData = (Object.keys(AROMA_GROUP_LABELS) as AromaGroup[]).map((grp) => ({
    label: AROMA_GROUP_LABELS[grp],
    value: groupCounts.get(grp) ?? 0,
  }));
  const hasAroma = radarData.some((d) => d.value > 0);

  // 분류·마신 방식·바디·증류소별 평균 점수
  const categoryStats = averageBy(tastings, (t) => t.whiskies?.category, scoreOf);
  const serveStats = averageBy(tastings, (t) => t.serve, scoreOf);
  const bodyStats = averageBy(tastings, (t) => t.palate_body, scoreOf);
  const distilleryStats = averageBy(tastings, (t) => t.whiskies?.distillery, scoreOf).slice(0, 6);

  // 취향 기반 추천 — 위스키별 최고점 상위 5개(80점 이상)를 기준으로 카탈로그에서 고른다
  const bestByWhisky = new Map<string, LikedWhisky>();
  for (const t of tastings) {
    if (t.score == null || !t.whiskies) continue;
    const prev = bestByWhisky.get(t.whisky_id);
    if (!prev || t.score > prev.score) {
      bestByWhisky.set(t.whisky_id, { ...t.whiskies, score: t.score });
    }
  }
  const liked = [...bestByWhisky.values()]
    .filter((w) => w.score >= 80)
    .sort((a, b) => b.score - a.score)
    .slice(0, 5);
  const excludeCatalog = new Set(
    [...(myWhiskiesRes.data ?? []), ...(wishlistRes.data ?? [])].map(
      (row) => (row as { catalog_id: string }).catalog_id
    )
  );
  const recommendations = recommendFromCatalog(
    liked,
    (catalogRes.data ?? []) as CatalogEntry[],
    excludeCatalog
  );

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
      <PageHeader
        eyebrow="Insights"
        title="통계"
        action={
          <Link
            href="/report"
            className="h-10 px-4 inline-flex items-center rounded-full border border-accent text-accent-bright text-sm"
          >
            연간 리포트
          </Link>
        }
      />

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
            <ScoreBars rows={categoryStats.map((r) => ({ ...r, label: CATEGORY_LABELS[r.key] }))} />
          </section>
        )}

        {aromaScoreStats.length > 0 && (
          <section>
            <SectionTitle>향과 점수</SectionTitle>
            <p className="text-xs text-muted -mt-2 mb-3">그 향을 고른 노트의 평균 점수</p>
            <ScoreBars
              rows={aromaScoreStats.map((r) => ({ ...r, label: AROMA_GROUP_LABELS[r.key] }))}
            />
          </section>
        )}

        {distilleryStats.length > 0 && (
          <section>
            <SectionTitle>증류소별 평균 점수</SectionTitle>
            <ScoreBars rows={distilleryStats.map((r) => ({ ...r, label: r.key }))} />
          </section>
        )}

        {serveStats.length > 0 && (
          <section>
            <SectionTitle>마신 방식별 평균 점수</SectionTitle>
            <ScoreBars rows={serveStats.map((r) => ({ ...r, label: SERVES[r.key] }))} />
          </section>
        )}

        {bodyStats.length > 0 && (
          <section>
            <SectionTitle>바디별 평균 점수</SectionTitle>
            <ScoreBars
              rows={bodyStats.map((r) => ({ ...r, label: `${PALATE_BODIES[r.key]} 바디` }))}
            />
          </section>
        )}
      </div>

      {recommendations.length > 0 && (
        <section>
          <SectionTitle>취향 기반 추천</SectionTitle>
          <p className="text-xs text-muted -mt-2 mb-3">
            높은 점수를 준 위스키와 증류소·지역·캐스크가 겹치는, 아직 기록하지 않은 위스키
          </p>
          <div className="grid gap-3 md:grid-cols-2">
            {recommendations.map(({ entry, reason }) => (
              <Card key={entry.id} className="!p-4 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-semibold truncate">{entry.name_ko ?? entry.name}</p>
                  <p className="text-xs text-muted mt-0.5 truncate">
                    {[entry.region ?? entry.country, CATEGORY_LABELS[entry.category]]
                      .filter(Boolean)
                      .join(' · ')}
                  </p>
                  <p className="text-xs text-accent mt-1">{reason}</p>
                </div>
                <form action={addWishlistFromCatalog} className="shrink-0">
                  <input type="hidden" name="catalog_id" value={entry.id} />
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

      <section>
        <SectionTitle>데이터 내보내기</SectionTitle>
        <Card className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-muted">
            백업이나 스프레드시트 분석용으로 기록을 내려받습니다. 메모로 남긴 과거 기록은{' '}
            <Link href="/import" className="text-accent-bright underline underline-offset-4">
              가져오기
            </Link>
            로 옮길 수 있습니다.
          </p>
          <div className="flex gap-2">
            <a
              href="/export?format=csv"
              className="h-10 px-4 inline-flex items-center rounded-full border border-accent text-accent-bright text-sm"
            >
              시음 노트 CSV
            </a>
            <a
              href="/export?format=json"
              className="h-10 px-4 inline-flex items-center rounded-full border border-hairline text-muted text-sm"
            >
              전체 JSON
            </a>
          </div>
        </Card>
      </section>
    </div>
  );
}
