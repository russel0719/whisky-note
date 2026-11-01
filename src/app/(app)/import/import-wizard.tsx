'use client';

import Link from 'next/link';
import { useActionState, useMemo, useState, useTransition } from 'react';
import {
  analyzeImport,
  commitImport,
  searchImportCandidates,
  type AnalyzedRow,
  type ImportCandidate,
  type ImportResult,
} from './actions';
import { Field, inputClass, SubmitButton, textareaClass } from '@/components/form';
import { scoreTextClass } from '@/components/ui';
import { formatKrw } from '@/lib/format';
import { applyMapping, fitScoreMapping } from '@/lib/legacy-import';
import { BOTTLE_STATUS_LABELS, BOTTLE_STATUSES, type BottleStatus } from '@/lib/types';

/** 줄마다 고친 값 — 비어 있으면 기본값(자동 매칭·환산 점수) */
interface RowEdit {
  include?: boolean;
  /** mine:<id> | catalog:<id> | manual */
  link?: string;
  score?: string;
  status?: BottleStatus;
  date?: string;
}

/** 기본 연결: 내 위스키 → 확실한 카탈로그 후보(exact/near) → 직접 등록 */
function defaultLink(row: AnalyzedRow): string {
  if (row.myWhisky) return `mine:${row.myWhisky.id}`;
  const sure = row.candidates.find((c) => c.level !== 'weak');
  return sure ? `catalog:${sure.id}` : 'manual';
}

/** 줄 하나를 다른 표기로 카탈로그에서 다시 찾기 */
function RowSearch({
  defaultQuery,
  onFound,
}: {
  defaultQuery: string;
  onFound: (found: ImportCandidate[]) => void;
}) {
  const [query, setQuery] = useState(defaultQuery);
  const [searching, startSearch] = useTransition();
  const [empty, setEmpty] = useState(false);
  return (
    <details className="text-sm">
      <summary className="text-xs text-faint cursor-pointer select-none">
        다른 이름으로 카탈로그 찾기
      </summary>
      <div className="flex gap-2 mt-2">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className={`${inputClass} !h-9`}
          aria-label="카탈로그 다시 검색"
        />
        <button
          type="button"
          disabled={searching}
          onClick={() =>
            startSearch(async () => {
              const found = await searchImportCandidates(query);
              setEmpty(found.length === 0);
              if (found.length > 0) onFound(found);
            })
          }
          className="h-9 px-4 rounded-full border border-accent text-accent-bright text-sm shrink-0 disabled:opacity-50"
        >
          {searching ? '…' : '검색'}
        </button>
      </div>
      {empty && <p className="text-xs text-faint mt-1">찾지 못했습니다.</p>}
    </details>
  );
}

export function ImportWizard({ defaultDate }: { defaultDate: string }) {
  const [text, setText] = useState('');
  const [rows, setRows] = useState<AnalyzedRow[] | null>(null);
  const [analyzing, startAnalyze] = useTransition();
  const [date, setDate] = useState(defaultDate);
  const [edits, setEdits] = useState<Record<number, RowEdit>>({});
  const [mappingOverride, setMappingOverride] = useState<{
    slope: string;
    intercept: string;
  } | null>(null);
  const [result, action, pending] = useActionState<ImportResult, FormData>(commitImport, {});

  // 환산식 — 앱에 이미 점수가 있는 위스키의 (원점수, 앱 점수) 쌍으로 추정
  const pairs = useMemo(
    () =>
      (rows ?? [])
        .filter((r) => r.existingScore != null)
        .map((r) => ({ row: r, source: r.sourceScore, score: r.existingScore! })),
    [rows]
  );
  const fitted = useMemo(() => fitScoreMapping(pairs), [pairs]);
  const mapping = mappingOverride
    ? {
        slope: Number(mappingOverride.slope) || 0,
        intercept: Number(mappingOverride.intercept) || 0,
      }
    : fitted;

  const edit = (index: number, patch: RowEdit) =>
    setEdits((prev) => ({ ...prev, [index]: { ...prev[index], ...patch } }));

  const resolved = (rows ?? []).map((row) => {
    const e = edits[row.index] ?? {};
    const score =
      e.score != null && e.score !== '' ? Number(e.score) : applyMapping(mapping, row.sourceScore);
    return {
      row,
      // 앱에 이미 기록이 있는 위스키는 기본으로 제외 (환산 기준으로만 사용)
      include: e.include ?? row.existingScore == null,
      link: e.link ?? defaultLink(row),
      score,
      status: e.status ?? ('finished' as BottleStatus),
      date: e.date || date,
    };
  });
  const selected = resolved.filter((r) => r.include);

  const payload = JSON.stringify(
    selected.map(({ row, link, score, status, date: d }) => ({
      whisky_id: link.startsWith('mine:') ? link.slice(5) : undefined,
      catalog_id: link.startsWith('catalog:') ? link.slice(8) : undefined,
      name: row.name,
      tasted_at: d,
      score,
      source_score: row.sourceScore,
      price: row.price,
      bottle_status: status,
    }))
  );

  if (result.imported != null) {
    return (
      <div className="bg-tile-1 border border-hairline rounded-(--radius-card) p-6 text-center space-y-4">
        <p className="font-display text-[26px]">{result.imported}개 기록을 가져왔습니다</p>
        <p className="text-sm text-muted">
          원점수는 노트에 함께 저장되어 있어, 나중에 환산식을 바꿔 다시 계산할 수 있습니다.
        </p>
        <div className="flex justify-center gap-2">
          <Link
            href="/tastings"
            className="h-10 px-5 inline-flex items-center rounded-full bg-accent text-on-accent text-sm font-semibold"
          >
            시음 노트 보기
          </Link>
          <Link
            href="/stats"
            className="h-10 px-5 inline-flex items-center rounded-full border border-hairline text-muted text-sm"
          >
            통계 보기
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <section className="space-y-4">
        <Field label="후기 목록 붙여 넣기" htmlFor="legacy_text">
          <textarea
            id="legacy_text"
            rows={8}
            value={text}
            onChange={(e) => setText(e.target.value)}
            className={textareaClass}
            placeholder={'피트/스모키\n라가불린 16Y(10.9)\t7.5\n아드벡 스모키버스\t7.3'}
          />
        </Field>
        <p className="text-xs text-faint">
          한 줄에 &ldquo;이름(가격 만원) 점수&rdquo; — 가격이 있으면 구매 기록(보틀)도 함께
          만듭니다. 점수 없는 줄은 섹션 제목, &ldquo;-&rdquo;로 시작하는 줄은 건너뜁니다.
        </p>
        <button
          type="button"
          disabled={analyzing || !text.trim()}
          onClick={() =>
            startAnalyze(async () => {
              setRows(await analyzeImport(text));
              setEdits({});
              setMappingOverride(null);
            })
          }
          className="h-11 px-6 rounded-full bg-accent text-on-accent text-sm font-semibold disabled:opacity-50"
        >
          {analyzing ? '카탈로그와 맞춰 보는 중…' : '분석'}
        </button>
      </section>

      {rows && rows.length === 0 && (
        <p className="text-sm text-danger">읽을 수 있는 줄이 없습니다. 형식을 확인해주세요.</p>
      )}

      {rows && rows.length > 0 && (
        <>
          <section className="bg-tile-1 border border-hairline rounded-(--radius-card) p-4 space-y-3">
            <h2 className="text-[19px] font-semibold">점수 환산</h2>
            <p className="text-sm text-muted">
              {fitted.method === 'default'
                ? '앱에 이미 점수를 매긴 위스키와 겹치는 기록이 없어 기본식을 씁니다 (원점수 5 = 70점).'
                : fitted.method === 'fit'
                  ? `겹치는 기록 ${fitted.n}개로 추정한 직선입니다.`
                  : `겹치는 기록 ${fitted.n}개의 평균에 맞췄습니다 (기울기는 기본값).`}
            </p>
            <div className="flex flex-wrap items-center gap-2 text-sm">
              <span className="text-muted">앱 점수 =</span>
              <input
                type="number"
                step="0.1"
                aria-label="절편"
                value={mappingOverride?.intercept ?? fitted.intercept.toFixed(1)}
                onChange={(e) =>
                  setMappingOverride({
                    slope: mappingOverride?.slope ?? fitted.slope.toFixed(2),
                    intercept: e.target.value,
                  })
                }
                className={`${inputClass} !w-24 !h-9`}
              />
              <span className="text-muted">+</span>
              <input
                type="number"
                step="0.1"
                aria-label="기울기"
                value={mappingOverride?.slope ?? fitted.slope.toFixed(2)}
                onChange={(e) =>
                  setMappingOverride({
                    intercept: mappingOverride?.intercept ?? fitted.intercept.toFixed(1),
                    slope: e.target.value,
                  })
                }
                className={`${inputClass} !w-24 !h-9`}
              />
              <span className="text-muted">× 원점수</span>
              {mappingOverride && (
                <button
                  type="button"
                  onClick={() => setMappingOverride(null)}
                  className="text-xs text-faint underline underline-offset-4"
                >
                  추정값으로
                </button>
              )}
            </div>
            <p className="text-xs text-faint tabular-nums">
              미리보기: 5 → {applyMapping(mapping, 5)} · 6.5 → {applyMapping(mapping, 6.5)} · 7.5 →{' '}
              {applyMapping(mapping, 7.5)} · 9 → {applyMapping(mapping, 9)}
            </p>
            {pairs.length > 0 && (
              <ul className="text-xs text-muted space-y-1 pt-1">
                {pairs.map(({ row, source, score }) => (
                  <li key={row.index} className="tabular-nums">
                    {row.myWhisky?.name}: 원점수 {source} ↔ 앱 {score}점 (환산하면{' '}
                    {applyMapping(mapping, source)})
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="space-y-3">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <h2 className="text-[19px] font-semibold">
                미리보기{' '}
                <span className="text-muted text-sm">
                  ({selected.length}/{rows.length}개 선택)
                </span>
              </h2>
              <label className="flex items-center gap-2 text-sm text-muted">
                시음일(일괄)
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className={`${inputClass} !w-auto !h-9`}
                />
              </label>
            </div>

            {resolved.map(({ row, include, link, score, status }) => (
              <div
                key={row.index}
                className={`bg-tile-1 border rounded-(--radius-card) p-4 space-y-3 ${
                  include ? 'border-hairline' : 'border-hairline-soft opacity-60'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <label className="flex items-start gap-3 min-w-0 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={include}
                      onChange={(e) => edit(row.index, { include: e.target.checked })}
                      className="mt-1.5 w-4 h-4 accent-(--color-accent)"
                    />
                    <span className="min-w-0">
                      <span className="block font-semibold">{row.name}</span>
                      <span className="block text-xs text-faint mt-0.5">
                        {[
                          row.section,
                          `원점수 ${row.sourceScore}`,
                          row.price != null ? `구매 ${formatKrw(row.price)}` : '시음만',
                        ]
                          .filter(Boolean)
                          .join(' · ')}
                      </span>
                      {row.existingScore != null && (
                        <span className="block text-xs text-accent mt-0.5">
                          이미 앱에 기록 있음 ({row.existingScore}점) — 환산 기준으로 사용
                        </span>
                      )}
                    </span>
                  </label>
                  <input
                    type="number"
                    min={0}
                    max={100}
                    aria-label={`${row.name} 환산 점수`}
                    value={edits[row.index]?.score ?? String(score)}
                    onChange={(e) => edit(row.index, { score: e.target.value })}
                    className={`w-16 h-9 px-2 text-center rounded-(--radius-utility) bg-tile-2 border border-hairline font-semibold tabular-nums text-[16px] shrink-0 ${scoreTextClass(score)}`}
                  />
                </div>

                <div className="grid gap-2 sm:grid-cols-[1fr_auto_auto]">
                  <select
                    aria-label={`${row.name} 위스키 연결`}
                    value={link}
                    onChange={(e) => edit(row.index, { link: e.target.value })}
                    className={`${inputClass} !h-10`}
                  >
                    {row.myWhisky && (
                      <option value={`mine:${row.myWhisky.id}`}>
                        내 위스키 · {row.myWhisky.name}
                      </option>
                    )}
                    {row.candidates.map((c) => (
                      <option key={c.id} value={`catalog:${c.id}`}>
                        카탈로그 · {c.name_ko ?? c.name}
                        {c.level === 'exact' ? '' : ' (유사)'}
                      </option>
                    ))}
                    <option value="manual">직접 등록 · {row.name}</option>
                  </select>
                  {row.price != null && (
                    <select
                      aria-label={`${row.name} 보틀 상태`}
                      value={status}
                      onChange={(e) => edit(row.index, { status: e.target.value as BottleStatus })}
                      className={`${inputClass} !h-10 sm:!w-28`}
                    >
                      {BOTTLE_STATUSES.map((s) => (
                        <option key={s} value={s}>
                          {s === 'finished'
                            ? '공병'
                            : s === 'open'
                              ? '개봉 중'
                              : BOTTLE_STATUS_LABELS[s]}
                        </option>
                      ))}
                    </select>
                  )}
                  <input
                    type="date"
                    aria-label={`${row.name} 시음일`}
                    value={edits[row.index]?.date ?? ''}
                    onChange={(e) => edit(row.index, { date: e.target.value })}
                    className={`${inputClass} !h-10 sm:!w-40 ${edits[row.index]?.date ? '' : 'text-faint'}`}
                    title="비우면 일괄 시음일"
                  />
                </div>

                {(() => {
                  const chosen = row.candidates.find((c) => `catalog:${c.id}` === link);
                  if (chosen && chosen.level !== 'exact') {
                    return (
                      <p className="text-xs text-accent-bright">
                        확인 필요 — 이름이 완전히 같지 않은 카탈로그 항목입니다
                      </p>
                    );
                  }
                  if (link === 'manual' && row.candidates.length > 0) {
                    return (
                      <p className="text-xs text-faint">
                        비슷한 카탈로그 항목이 있습니다. 같은 위스키면 위에서 골라주세요
                      </p>
                    );
                  }
                  return null;
                })()}
                <RowSearch
                  defaultQuery={row.searchName}
                  onFound={(found) => {
                    setRows((prev) =>
                      (prev ?? []).map((r) =>
                        r.index === row.index ? { ...r, candidates: found } : r
                      )
                    );
                    const sure = found.find((c) => c.level !== 'weak');
                    edit(row.index, { link: sure ? `catalog:${sure.id}` : undefined });
                  }}
                />
              </div>
            ))}
          </section>

          <form action={action} className="space-y-3">
            <input type="hidden" name="rows" value={payload} />
            {result.error && <p className="text-danger text-sm">{result.error}</p>}
            <SubmitButton pending={pending}>{selected.length}개 기록 가져오기</SubmitButton>
          </form>
        </>
      )}
    </div>
  );
}
