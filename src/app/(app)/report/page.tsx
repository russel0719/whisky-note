import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { AromaRadar, MonthlyBars, ScoreDial } from '@/components/charts';
import {
  Card,
  EmptyState,
  Eyebrow,
  ScoreBars,
  scoreTextClass,
  SectionTitle,
} from '@/components/ui';
import { formatKrw } from '@/lib/format';
import { buildYearReport, type ReportBottle, type ReportTasting } from '@/lib/report';
import { AROMA_GROUP_LABELS, CATEGORY_LABELS, SERVES, type AromaGroup } from '@/lib/types';

export const metadata = { title: '연간 리포트' };

export default async function ReportPage({
  searchParams,
}: {
  searchParams: Promise<{ year?: string; imported?: string }>;
}) {
  const params = await searchParams;
  const thisYear = new Date().getFullYear();
  const year = Number(params.year) >= 1900 ? Math.floor(Number(params.year)) : thisYear;
  // 가져온 과거 기록은 실제 시음일이 아닌 일괄 날짜라, 기본으로는 빼고 본다
  const includeImported = params.imported === '1';
  const from = `${year}-01-01`;
  const to = `${year + 1}-01-01`;

  const supabase = await createClient();
  let tastingsQuery = supabase
    .from('tastings')
    .select(
      'id, whisky_id, tasted_at, score, serve, price_paid, flight_id, whiskies!inner(name, category), tasting_aromas(tag_id, aroma_tags(name, grp))'
    )
    .gte('tasted_at', from)
    .lt('tasted_at', to);
  if (!includeImported) tastingsQuery = tastingsQuery.is('source_score', null);

  const [tastingsRes, boughtRes, openedRes, priorRes, yearsRes, importedRes] = await Promise.all([
    tastingsQuery,
    supabase
      .from('bottles')
      .select('purchase_date, purchase_price')
      .gte('purchase_date', from)
      .lt('purchase_date', to),
    supabase
      .from('bottles')
      .select('id', { count: 'exact', head: true })
      .gte('open_date', from)
      .lt('open_date', to),
    supabase
      .from('tastings')
      .select('whisky_id')
      .lt('tasted_at', from)
      .not('whisky_id', 'is', null),
    supabase.from('tastings').select('tasted_at').order('tasted_at', { ascending: true }).limit(1),
    supabase
      .from('tastings')
      .select('id', { count: 'exact', head: true })
      .gte('tasted_at', from)
      .lt('tasted_at', to)
      .not('source_score', 'is', null),
  ]);

  const report = buildYearReport(
    year,
    (tastingsRes.data ?? []) as unknown as ReportTasting[],
    (boughtRes.data ?? []) as ReportBottle[],
    openedRes.count ?? 0,
    new Set(((priorRes.data ?? []) as { whisky_id: string }[]).map((r) => r.whisky_id))
  );
  const firstYear = Number(
    ((yearsRes.data ?? []) as { tasted_at: string }[])[0]?.tasted_at.slice(0, 4) ?? thisYear
  );
  const years = Array.from({ length: thisYear - firstYear + 1 }, (_, i) => thisYear - i);
  const importedCount = importedRes.count ?? 0;
  const yearHref = (y: number, imported = includeImported) =>
    `/report?year=${y}${imported ? '&imported=1' : ''}`;

  const hero = report.top[0];
  const radarData = (Object.keys(AROMA_GROUP_LABELS) as AromaGroup[]).map((grp) => ({
    label: AROMA_GROUP_LABELS[grp],
    value: report.aromaGroups.get(grp) ?? 0,
  }));

  return (
    <div className="space-y-10">
      <header>
        <Eyebrow>Year in Whisky</Eyebrow>
        <h1 className="font-display text-[36px] md:text-[44px] leading-tight">{year}년의 위스키</h1>
        <div className="flex flex-wrap gap-2 mt-4">
          {years.map((y) => (
            <Link
              key={y}
              href={yearHref(y)}
              className={`h-9 px-4 inline-flex items-center rounded-full border text-sm ${
                y === year
                  ? 'border-accent text-accent-bright bg-accent/10'
                  : 'border-hairline text-muted'
              }`}
            >
              {y}
            </Link>
          ))}
        </div>
        {(importedCount > 0 || includeImported) && (
          <p className="text-xs text-faint mt-3">
            {includeImported
              ? '가져온 과거 기록 포함 중. '
              : `가져온 과거 기록 ${importedCount}개는 제외했습니다. `}
            <Link href={yearHref(year, !includeImported)} className="underline underline-offset-4">
              {includeImported ? '제외하기' : '포함하기'}
            </Link>
          </p>
        )}
      </header>

      {report.tastingCount === 0 ? (
        <EmptyState
          message={`${year}년의 시음 기록이 없습니다.`}
          ctaHref="/tastings/new"
          ctaLabel="시음 노트 작성"
        />
      ) : (
        <>
          {hero && (
            <Link href={`/whiskies/${hero.whisky_id}`} className="block group">
              <section
                className="relative overflow-hidden bg-tile-2 border border-hairline rounded-(--radius-card) p-6 md:p-9 transition-colors group-hover:border-accent/30"
                style={{
                  backgroundImage:
                    'radial-gradient(ellipse 60% 80% at 85% 0%, rgba(201, 150, 63, 0.07), transparent)',
                }}
              >
                <div className="flex items-center justify-between gap-6">
                  <div className="min-w-0">
                    <Eyebrow>올해의 위스키</Eyebrow>
                    <p className="font-display text-[28px] md:text-[36px] leading-tight">
                      {hero.name}
                    </p>
                  </div>
                  <ScoreDial value={hero.score} size={104} label="최고점" />
                </div>
              </section>
            </Link>
          )}

          <section className="grid grid-cols-3 gap-3">
            {[
              { value: report.tastingCount, label: '잔' },
              { value: report.whiskyCount, label: '종류' },
              { value: report.avgScore ?? '—', label: '평균 점수', score: report.avgScore },
            ].map(({ value, label, score }) => (
              <Card key={label} className="text-center !p-4">
                <p
                  className={`font-display text-[28px] tabular-nums ${score !== undefined ? scoreTextClass(score) : ''}`}
                >
                  {value}
                </p>
                <p className="text-xs text-muted mt-1">{label}</p>
              </Card>
            ))}
          </section>

          <div className="grid gap-10 md:grid-cols-2 md:gap-8">
            {report.top.length > 1 && (
              <section>
                <SectionTitle>베스트 {report.top.length}</SectionTitle>
                <Card className="space-y-3">
                  {report.top.map((h, i) => (
                    <Link
                      key={h.whisky_id}
                      href={`/whiskies/${h.whisky_id}`}
                      className="flex items-center justify-between gap-3 hover:text-accent-bright"
                    >
                      <span className="min-w-0 truncate">
                        <span className="text-faint tabular-nums mr-2">{i + 1}</span>
                        {h.name}
                      </span>
                      <span
                        className={`font-display text-[20px] tabular-nums ${scoreTextClass(h.score)}`}
                      >
                        {h.score}
                      </span>
                    </Link>
                  ))}
                </Card>
              </section>
            )}

            {radarData.some((d) => d.value > 0) && (
              <section>
                <SectionTitle>올해의 향</SectionTitle>
                <Card>
                  <AromaRadar data={radarData} />
                  <div className="flex flex-wrap gap-2 mt-4">
                    {report.topAromas.map(({ name, count }) => (
                      <span
                        key={name}
                        className="inline-flex items-center gap-1.5 h-8 px-3 rounded-full border border-hairline text-sm"
                      >
                        {name}
                        <span className="text-faint text-xs tabular-nums">{count}</span>
                      </span>
                    ))}
                  </div>
                </Card>
              </section>
            )}

            <section>
              <SectionTitle>발견</SectionTitle>
              <Card className="space-y-3 text-sm">
                <p>
                  새로 만난 위스키{' '}
                  <span className="font-semibold text-accent-bright tabular-nums">
                    {report.newWhiskies.length}종
                  </span>
                </p>
                {report.newWhiskies.length > 0 && (
                  <p className="text-muted leading-relaxed">
                    {report.newWhiskies
                      .slice(0, 12)
                      .map((w) => w.name)
                      .join(' · ')}
                    {report.newWhiskies.length > 12
                      ? ` 외 ${report.newWhiskies.length - 12}종`
                      : ''}
                  </p>
                )}
                {report.mostTasted && (
                  <p>
                    가장 자주 마신 위스키{' '}
                    <Link
                      href={`/whiskies/${report.mostTasted.whisky_id}`}
                      className="font-semibold text-accent-bright"
                    >
                      {report.mostTasted.name}
                    </Link>{' '}
                    <span className="text-muted">({report.mostTasted.count}번)</span>
                  </p>
                )}
                {report.flightCount > 0 && (
                  <p>
                    플라이트{' '}
                    <span className="font-semibold tabular-nums">{report.flightCount}번</span>
                  </p>
                )}
              </Card>
            </section>

            <section>
              <SectionTitle>지출</SectionTitle>
              <Card className="space-y-2 text-sm">
                <p className="flex justify-between">
                  <span className="text-muted">보틀 구매 ({report.bottlesBought}병)</span>
                  <span className="tabular-nums">{formatKrw(report.bottleSpend)}</span>
                </p>
                <p className="flex justify-between">
                  <span className="text-muted">바 · 잔</span>
                  <span className="tabular-nums">{formatKrw(report.barSpend)}</span>
                </p>
                <p className="flex justify-between pt-2 border-t border-hairline-soft">
                  <span>합계</span>
                  <span className="font-semibold tabular-nums">
                    {formatKrw(report.bottleSpend + report.barSpend)}
                  </span>
                </p>
                <p className="text-xs text-faint pt-1">올해 개봉한 보틀 {report.bottlesOpened}병</p>
              </Card>
            </section>

            {report.byCategory.length > 0 && (
              <section>
                <SectionTitle>분류별</SectionTitle>
                <ScoreBars
                  rows={report.byCategory.map((r) => ({ ...r, label: CATEGORY_LABELS[r.key] }))}
                />
              </section>
            )}

            {report.byServe.length > 0 && (
              <section>
                <SectionTitle>마신 방식별</SectionTitle>
                <ScoreBars rows={report.byServe.map((r) => ({ ...r, label: SERVES[r.key] }))} />
              </section>
            )}
          </div>

          <section>
            <SectionTitle>월별 시음</SectionTitle>
            <Card>
              <MonthlyBars
                data={report.monthly.map((value, i) => ({
                  label: `${i + 1}월`,
                  value,
                  title: `${year}-${String(i + 1).padStart(2, '0')}: ${value}회`,
                }))}
                format={(v) => `${v}회`}
              />
            </Card>
          </section>
        </>
      )}
    </div>
  );
}
