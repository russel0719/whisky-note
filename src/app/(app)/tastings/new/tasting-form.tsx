'use client';

import { useActionState, useEffect, useMemo, useState } from 'react';
import { getLastTasting, type LastTasting } from '../lookup';
import { createTasting, updateTasting, type FormState } from '../actions';
import { AromaWheelPicker } from '@/components/aroma-wheel';
import { ColorBarPicker } from '@/components/color-bar';
import { Field, inputClass, SubmitButton, textareaClass } from '@/components/form';
import { PhotoInput } from '@/components/photo-input';
import { WhiskyPicker, type PickerWhisky } from '@/components/whisky-picker';
import { scoreTextClass } from '@/components/ui';
import { averageScore, formatDate, formatOpenAge } from '@/lib/format';
import { ChoiceChips } from '@/components/choice-chips';
import {
  BOTTLE_STATUS_LABELS,
  BUY_AGAIN_LABELS,
  FINISH_CHARACTERS,
  FINISH_LENGTHS,
  NOSE_INTENSITIES,
  PALATE_BODIES,
  PALATE_SWEETNESS,
  PALATE_TEXTURES,
  SERVES,
  STAGE_LABELS,
  type AromaStage,
  type AromaTag,
  type Bottle,
  type BuyAgain,
  type CatalogEntry,
  type TastingFull,
  type TastingStage,
} from '@/lib/types';

function today(): string {
  const d = new Date();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${mm}-${dd}`;
}

function ScoreRow({
  label,
  name,
  value,
  onChange,
}: {
  label: string;
  name: string;
  value: number | null;
  onChange: (v: number | null) => void;
}) {
  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <label htmlFor={name} className="text-sm text-muted">
          {label}
        </label>
        <div className="flex items-center gap-2">
          <input
            id={name}
            type="number"
            min={0}
            max={100}
            value={value ?? ''}
            placeholder="—"
            onChange={(e) =>
              onChange(
                e.target.value === '' ? null : Math.max(0, Math.min(100, Number(e.target.value)))
              )
            }
            className="w-16 h-9 px-2 text-center rounded-(--radius-utility) bg-tile-1 border border-hairline text-accent-bright font-semibold tabular-nums text-[16px]"
          />
          {value != null && (
            <button
              type="button"
              onClick={() => onChange(null)}
              className="text-faint text-xs"
              aria-label={`${label} 점수 지우기`}
            >
              지움
            </button>
          )}
        </div>
      </div>
      <input
        type="range"
        min={0}
        max={100}
        value={value ?? 75}
        onChange={(e) => onChange(Number(e.target.value))}
        className={`w-full ${value == null ? 'opacity-40' : ''}`}
        aria-label={`${label} 슬라이더`}
      />
      <input type="hidden" name={name} value={value ?? ''} />
    </div>
  );
}

export interface FlightContext {
  id: string;
  name: string;
  blind: boolean;
  tasted_at: string;
  location: string | null;
  /** 새 잔의 번호 */
  position: number;
}

function stageTagIds(initial: TastingFull | undefined, stage: AromaStage): number[] {
  return (initial?.tasting_aromas ?? [])
    .filter((row) => row.stage === stage)
    .map((row) => row.aroma_tags.id);
}

const POUR_PRESETS = [15, 30, 45, 60];

/** 따른 양 — 저장하면 연결한 보틀의 잔량에서 차감된다 */
function PourInput({ defaultValue, bottle }: { defaultValue: number | null; bottle?: Bottle }) {
  const [pour, setPour] = useState(defaultValue != null ? String(defaultValue) : '');
  const pct = bottle && pour ? Math.round((Number(pour) * 100) / bottle.size_ml) : null;
  return (
    <div>
      <label htmlFor="pour_ml" className="text-sm text-muted">
        따른 양 <span className="text-faint text-xs">(입력하면 보틀 잔량에서 차감)</span>
      </label>
      <div className="flex flex-wrap items-center gap-2 mt-1.5">
        {POUR_PRESETS.map((ml) => (
          <button
            key={ml}
            type="button"
            aria-pressed={pour === String(ml)}
            onClick={() => setPour(pour === String(ml) ? '' : String(ml))}
            className={`h-9 px-3.5 rounded-full border text-sm active:scale-95 ${
              pour === String(ml)
                ? 'border-accent text-accent-bright bg-accent/10'
                : 'border-hairline text-muted'
            }`}
          >
            {ml}ml
          </button>
        ))}
        <input
          id="pour_ml"
          name="pour_ml"
          type="number"
          min={1}
          max={1000}
          inputMode="numeric"
          value={pour}
          onChange={(e) => setPour(e.target.value)}
          placeholder="ml"
          className={`${inputClass} !w-24`}
        />
      </div>
      {bottle && (
        <p className="text-xs text-faint mt-2">
          {bottle.status === 'unopened' && '미개봉 보틀 — 저장하면 시음일로 개봉 처리됩니다. '}
          {pct != null && Number.isFinite(pct)
            ? `잔량 약 ${pct}%p 차감 (${bottle.size_ml}ml 기준)`
            : ''}
        </p>
      )}
    </div>
  );
}

/** 같은 위스키의 직전 기록 — 다시 마실 때 비교 기준 */
function LastTastingCard({ whiskyId }: { whiskyId: string }) {
  const [last, setLast] = useState<{ whiskyId: string; data: LastTasting | null } | null>(null);
  useEffect(() => {
    let cancelled = false;
    getLastTasting(whiskyId).then((data) => {
      if (!cancelled) setLast({ whiskyId, data });
    });
    return () => {
      cancelled = true;
    };
  }, [whiskyId]);
  const data = last?.whiskyId === whiskyId ? last.data : null;
  if (!data) return null;
  return (
    <div className="bg-tile-1 border border-hairline rounded-(--radius-card) p-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-faint">지난 기록 · {formatDate(data.tasted_at)}</p>
        {data.score != null && (
          <p className={`font-display text-[22px] tabular-nums ${scoreTextClass(data.score)}`}>
            {data.score}
          </p>
        )}
      </div>
      {data.descriptors && <p className="text-sm text-muted mt-1">{data.descriptors}</p>}
      {data.aromas.length > 0 && (
        <p className="text-sm text-accent-bright mt-1">{data.aromas.join(' · ')}</p>
      )}
      {data.comment && <p className="text-sm mt-2 line-clamp-2">{data.comment}</p>}
    </div>
  );
}

function StageBlock({ children }: { children: React.ReactNode }) {
  return <div className="space-y-4 pt-5 border-t border-hairline-soft">{children}</div>;
}

function StageAromas({
  stage,
  aromaTags,
  initial,
}: {
  stage: TastingStage;
  aromaTags: AromaTag[];
  initial?: TastingFull;
}) {
  return (
    <div>
      <p className="text-sm text-muted mb-2">아로마</p>
      <AromaWheelPicker
        aromaTags={aromaTags}
        name={`aroma_${stage}`}
        defaultSelected={stageTagIds(initial, stage)}
        collapsible
      />
    </div>
  );
}

/** 선택형 도입 전에 서술로 남긴 단계 노트 — 값이 있을 때만 편집 가능하게 노출 */
function LegacyNote({ name, value }: { name: string; value: string | null | undefined }) {
  if (!value) return null;
  return (
    <div>
      <p className="text-sm text-faint mb-2">예전에 서술로 남긴 노트 (비우면 삭제)</p>
      <textarea name={name} rows={2} defaultValue={value} className={textareaClass} />
    </div>
  );
}

export function TastingForm({
  whiskies,
  bottles,
  aromaTags,
  defaultWhiskyId,
  defaultBottleId,
  defaultCatalog,
  flight,
  initial,
}: {
  whiskies: PickerWhisky[];
  bottles: Bottle[];
  aromaTags: AromaTag[];
  defaultWhiskyId?: string;
  defaultBottleId?: string;
  defaultCatalog?: CatalogEntry | null;
  /** 플라이트의 잔으로 기록할 때 (새 잔이면 position은 다음 번호) */
  flight?: FlightContext | null;
  initial?: TastingFull;
}) {
  const isEdit = initial != null;
  const [state, action, pending] = useActionState<FormState, FormData>(
    isEdit ? updateTasting : createTasting,
    {}
  );
  const [whiskyId, setWhiskyId] = useState(initial?.whisky_id ?? defaultWhiskyId ?? '');
  const [bottleId, setBottleId] = useState(initial?.bottle_id ?? defaultBottleId ?? '');
  const [nose, setNose] = useState<number | null>(initial?.nose_score ?? null);
  const [palate, setPalate] = useState<number | null>(initial?.palate_score ?? null);
  const [finish, setFinish] = useState<number | null>(initial?.finish_score ?? null);

  const whiskyBottles = useMemo(
    () => bottles.filter((b) => b.whisky_id === whiskyId),
    [bottles, whiskyId]
  );
  const suggested = averageScore(nose, palate, finish);

  const flightId = initial?.flight_id ?? flight?.id ?? null;
  const flightPosition = initial?.flight_position ?? flight?.position ?? null;
  const isBlindFlight = flight?.blind ?? false;
  // 위스키를 아직 모르는(공개 전) 블라인드 잔 — 새 잔이거나, 편집 중인데 위스키가 비어 있음
  const blindGlass = isBlindFlight && !isEdit;
  // 공개 후 편집할 때도 추측은 보존
  const savedGuess = initial?.blind_guess ?? null;
  const legacyTags = useMemo(() => stageTagIds(initial, 'overall'), [initial]);

  return (
    <form action={action} className="space-y-8">
      {isEdit && <input type="hidden" name="id" value={initial.id} />}
      {flightId && (
        <>
          <input type="hidden" name="flight_id" value={flightId} />
          <input type="hidden" name="flight_position" value={flightPosition ?? ''} />
        </>
      )}

      <section className="space-y-4">
        {flight && (
          <p className="text-sm text-accent-bright">
            {flight.name} · {flightPosition}번 잔{blindGlass ? ' · 블라인드' : ''}
          </p>
        )}

        {blindGlass ? (
          <Field label="추측 (선택)" htmlFor="blind_guess">
            <input
              id="blind_guess"
              name="blind_guess"
              className={inputClass}
              placeholder="예: 아일라 피트, 셰리 캐스크 10년 이상"
            />
          </Field>
        ) : (
          <div>
            <p className="text-sm text-muted mb-1.5">
              위스키 {!isBlindFlight && <span className="text-accent">*</span>}
            </p>
            <WhiskyPicker
              whiskies={whiskies}
              defaultWhiskyId={initial?.whisky_id ?? defaultWhiskyId}
              defaultCatalog={defaultCatalog}
              allowCreate={!isEdit}
              onChange={(id) => {
                setWhiskyId(id ?? '');
                setBottleId('');
              }}
            />
            {savedGuess && (
              <>
                <p className="text-xs text-faint mt-2">블라인드 추측: {savedGuess}</p>
                <input type="hidden" name="blind_guess" value={savedGuess} />
              </>
            )}
          </div>
        )}

        {!isEdit && whiskyId && !blindGlass && <LastTastingCard whiskyId={whiskyId} />}

        {!blindGlass && whiskyBottles.length > 0 && (
          <Field label="보틀 연결 (개봉 경과 · 잔량 추적)" htmlFor="bottle_id">
            <select
              id="bottle_id"
              name="bottle_id"
              value={bottleId}
              onChange={(e) => setBottleId(e.target.value)}
              className={inputClass}
            >
              <option value="">보틀 없이 (바 · 모임 시음)</option>
              {whiskyBottles.map((b) => (
                <option key={b.id} value={b.id}>
                  {formatDate(b.purchase_date)} 구매 · {BOTTLE_STATUS_LABELS[b.status]}
                  {formatOpenAge(b.open_date) ? ` · ${formatOpenAge(b.open_date)}` : ''}
                  {b.status !== 'unopened' ? ` · 잔량 ${b.remaining_pct}%` : ''}
                </option>
              ))}
            </select>
          </Field>
        )}

        {bottleId && (
          <PourInput
            defaultValue={initial?.pour_ml ?? null}
            bottle={whiskyBottles.find((b) => b.id === bottleId)}
          />
        )}

        <div className="grid grid-cols-2 gap-3">
          <Field label="시음일" htmlFor="tasted_at" required>
            <input
              id="tasted_at"
              name="tasted_at"
              type="date"
              required
              defaultValue={initial?.tasted_at?.slice(0, 10) ?? flight?.tasted_at ?? today()}
              className={inputClass}
            />
          </Field>
          <Field label="장소" htmlFor="location">
            <input
              id="location"
              name="location"
              defaultValue={initial?.location ?? flight?.location ?? ''}
              className={inputClass}
              placeholder="예: 집, OO바"
            />
          </Field>
        </div>
      </section>

      <section className="space-y-6">
        <h2 className="text-[21px] font-semibold">평가 (100점제)</h2>
        <ChoiceChips
          label="마신 방식"
          name="serve"
          options={SERVES}
          defaultValue={initial?.serve ? [initial.serve] : []}
        />

        <StageBlock>
          <ScoreRow label={STAGE_LABELS.nose} name="nose_score" value={nose} onChange={setNose} />
          <ChoiceChips
            label="강도"
            name="nose_intensity"
            options={NOSE_INTENSITIES}
            defaultValue={initial?.nose_intensity ? [initial.nose_intensity] : []}
          />
          <StageAromas stage="nose" aromaTags={aromaTags} initial={initial} />
          <LegacyNote name="nose_note" value={initial?.nose_note} />
        </StageBlock>

        <StageBlock>
          <ScoreRow
            label={STAGE_LABELS.palate}
            name="palate_score"
            value={palate}
            onChange={setPalate}
          />
          <ChoiceChips
            label="바디"
            name="palate_body"
            options={PALATE_BODIES}
            defaultValue={initial?.palate_body ? [initial.palate_body] : []}
          />
          <ChoiceChips
            label="단맛"
            name="palate_sweetness"
            options={PALATE_SWEETNESS}
            defaultValue={initial?.palate_sweetness ? [initial.palate_sweetness] : []}
          />
          <ChoiceChips
            label="질감"
            name="palate_texture"
            options={PALATE_TEXTURES}
            multiple
            defaultValue={initial?.palate_texture ?? []}
          />
          <StageAromas stage="palate" aromaTags={aromaTags} initial={initial} />
          <LegacyNote name="palate_note" value={initial?.palate_note} />
        </StageBlock>

        <StageBlock>
          <ScoreRow
            label={STAGE_LABELS.finish}
            name="finish_score"
            value={finish}
            onChange={setFinish}
          />
          <ChoiceChips
            label="길이"
            name="finish_length"
            options={FINISH_LENGTHS}
            defaultValue={initial?.finish_length ? [initial.finish_length] : []}
          />
          <ChoiceChips
            label="특징"
            name="finish_character"
            options={FINISH_CHARACTERS}
            multiple
            defaultValue={initial?.finish_character ?? []}
          />
          <StageAromas stage="finish" aromaTags={aromaTags} initial={initial} />
          <LegacyNote name="finish_note" value={initial?.finish_note} />
        </StageBlock>

        <Field label="총점 (비우면 N/P/F 평균으로 표시)" htmlFor="overall_score">
          <input
            id="overall_score"
            name="overall_score"
            type="number"
            min={0}
            max={100}
            defaultValue={initial?.overall_score ?? ''}
            placeholder={suggested != null ? `평균 ${suggested}` : '—'}
            className={inputClass}
          />
        </Field>
      </section>

      <section>
        <h2 className="text-[21px] font-semibold mb-4">컬러</h2>
        <ColorBarPicker defaultValue={initial?.color} />
      </section>

      {legacyTags.length > 0 && (
        <section>
          <h2 className="text-[21px] font-semibold mb-1">아로마 (단계 미지정)</h2>
          <p className="text-sm text-faint mb-4">
            단계별 기록 이전에 남긴 태그입니다. 위의 단계에 다시 고르고 여기서 지워도 됩니다.
          </p>
          <AromaWheelPicker
            aromaTags={aromaTags}
            name="aroma_overall"
            defaultSelected={legacyTags}
            collapsible
          />
        </section>
      )}

      <section className="space-y-4">
        <h2 className="text-[21px] font-semibold">총평</h2>
        <textarea
          name="comment"
          rows={3}
          defaultValue={initial?.comment ?? ''}
          className={textareaClass}
          placeholder="한두 문장으로 — 전체적인 인상, 함께한 사람, 그날의 기분"
        />
      </section>

      <section className="space-y-4">
        <h2 className="text-[21px] font-semibold">기타</h2>
        <PhotoInput name="photo_url" label="사진" defaultUrl={initial?.photo_url} />
        <div className="grid grid-cols-2 gap-3">
          <Field label="페어링" htmlFor="pairing">
            <input
              id="pairing"
              name="pairing"
              defaultValue={initial?.pairing ?? ''}
              className={inputClass}
              placeholder="예: 다크초콜릿"
            />
          </Field>
          <Field label="잔 가격 (바 시음 시, 원)" htmlFor="price_paid">
            <input
              id="price_paid"
              name="price_paid"
              type="number"
              min={0}
              step={100}
              defaultValue={initial?.price_paid ?? ''}
              className={inputClass}
              placeholder="25000"
            />
          </Field>
        </div>
        <div>
          <p className="text-sm text-muted mb-2">재구매 의사</p>
          <div className="flex gap-2">
            {(Object.keys(BUY_AGAIN_LABELS) as BuyAgain[]).map((key) => (
              <label
                key={key}
                className="inline-flex items-center h-9 px-4 rounded-full border border-hairline text-sm text-muted cursor-pointer select-none has-checked:border-accent has-checked:text-accent-bright has-checked:bg-accent/10"
              >
                <input
                  type="radio"
                  name="would_buy_again"
                  value={key}
                  defaultChecked={initial?.would_buy_again === key}
                  className="sr-only"
                />
                {BUY_AGAIN_LABELS[key]}
              </label>
            ))}
          </div>
        </div>
      </section>

      {state.error && <p className="text-danger text-sm">{state.error}</p>}
      <SubmitButton pending={pending}>{isEdit ? '변경 사항 저장' : '노트 저장'}</SubmitButton>
    </form>
  );
}
