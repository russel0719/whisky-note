'use client';

import { useActionState, useMemo, useState } from 'react';
import { createTasting, type FormState } from '../actions';
import { Field, inputClass, SubmitButton, textareaClass } from '@/components/form';
import { WhiskyFields } from '@/components/whisky-fields';
import { averageScore, formatDate, formatOpenAge } from '@/lib/format';
import {
  AROMA_GROUPS,
  AROMA_GROUP_LABELS,
  BOTTLE_STATUS_LABELS,
  BUY_AGAIN_LABELS,
  type AromaTag,
  type Bottle,
  type BuyAgain,
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
              onChange(e.target.value === '' ? null : Math.max(0, Math.min(100, Number(e.target.value))))
            }
            className="w-16 h-8 px-2 text-center rounded-(--radius-utility) bg-tile-1 border border-hairline text-accent-bright font-semibold tabular-nums"
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

export function TastingForm({
  whiskies,
  bottles,
  aromaTags,
  defaultWhiskyId,
}: {
  whiskies: { id: string; name: string }[];
  bottles: Bottle[];
  aromaTags: AromaTag[];
  defaultWhiskyId?: string;
}) {
  const [state, action, pending] = useActionState<FormState, FormData>(createTasting, {});
  const [whiskyId, setWhiskyId] = useState(defaultWhiskyId ?? '');
  const [nose, setNose] = useState<number | null>(null);
  const [palate, setPalate] = useState<number | null>(null);
  const [finish, setFinish] = useState<number | null>(null);

  const isNewWhisky = whiskyId === '__new__';
  const whiskyBottles = useMemo(
    () => bottles.filter((b) => b.whisky_id === whiskyId),
    [bottles, whiskyId]
  );
  const suggested = averageScore(nose, palate, finish);

  const tagsByGroup = useMemo(() => {
    const map = new Map<string, AromaTag[]>();
    for (const tag of aromaTags) {
      const list = map.get(tag.grp) ?? [];
      list.push(tag);
      map.set(tag.grp, list);
    }
    return map;
  }, [aromaTags]);

  return (
    <form action={action} className="space-y-8">
      <section className="space-y-4">
        <Field label="위스키" htmlFor="whisky_id" required>
          <select
            id="whisky_id"
            name="whisky_id"
            required
            value={whiskyId}
            onChange={(e) => setWhiskyId(e.target.value)}
            className={inputClass}
          >
            <option value="" disabled>
              선택
            </option>
            {whiskies.map((w) => (
              <option key={w.id} value={w.id}>
                {w.name}
              </option>
            ))}
            <option value="__new__">＋ 새 위스키 등록</option>
          </select>
        </Field>

        {isNewWhisky && (
          <div className="bg-tile-1 border border-hairline rounded-(--radius-card) p-4">
            <WhiskyFields prefix="new_" />
          </div>
        )}

        {!isNewWhisky && whiskyBottles.length > 0 && (
          <Field label="보틀 연결 (개봉 경과 추적)" htmlFor="bottle_id">
            <select id="bottle_id" name="bottle_id" defaultValue="" className={inputClass}>
              <option value="">보틀 없이 (바 · 모임 시음)</option>
              {whiskyBottles.map((b) => (
                <option key={b.id} value={b.id}>
                  {formatDate(b.purchase_date)} 구매 · {BOTTLE_STATUS_LABELS[b.status]}
                  {formatOpenAge(b.open_date) ? ` · ${formatOpenAge(b.open_date)}` : ''}
                </option>
              ))}
            </select>
          </Field>
        )}

        <div className="grid grid-cols-2 gap-3">
          <Field label="시음일" htmlFor="tasted_at" required>
            <input
              id="tasted_at"
              name="tasted_at"
              type="date"
              required
              defaultValue={today()}
              className={inputClass}
            />
          </Field>
          <Field label="장소" htmlFor="location">
            <input
              id="location"
              name="location"
              className={inputClass}
              placeholder="예: 집, OO바"
            />
          </Field>
        </div>
      </section>

      <section className="space-y-5">
        <h2 className="text-[21px] font-semibold">평가 (100점제)</h2>
        <ScoreRow label="Nose (향)" name="nose_score" value={nose} onChange={setNose} />
        <textarea
          name="nose_note"
          rows={2}
          className={textareaClass}
          placeholder="향에 대한 노트 — 예: 꿀, 서양배, 은은한 오크"
        />
        <ScoreRow label="Palate (맛)" name="palate_score" value={palate} onChange={setPalate} />
        <textarea
          name="palate_note"
          rows={2}
          className={textareaClass}
          placeholder="맛에 대한 노트 — 예: 바닐라, 시나몬, 크리미한 질감"
        />
        <ScoreRow label="Finish (여운)" name="finish_score" value={finish} onChange={setFinish} />
        <textarea
          name="finish_note"
          rows={2}
          className={textareaClass}
          placeholder="여운에 대한 노트 — 예: 길고 드라이한 피니시"
        />
        <Field label="총점 (비우면 N/P/F 평균으로 표시)" htmlFor="overall_score">
          <input
            id="overall_score"
            name="overall_score"
            type="number"
            min={0}
            max={100}
            placeholder={suggested != null ? `평균 ${suggested}` : '—'}
            className={inputClass}
          />
        </Field>
      </section>

      <section>
        <h2 className="text-[21px] font-semibold mb-4">아로마</h2>
        <div className="space-y-4">
          {AROMA_GROUPS.map((grp) => {
            const tags = tagsByGroup.get(grp);
            if (!tags || tags.length === 0) return null;
            return (
              <div key={grp}>
                <p className="text-xs text-faint mb-2">{AROMA_GROUP_LABELS[grp]}</p>
                <div className="flex flex-wrap gap-2">
                  {tags.map((tag) => (
                    <label
                      key={tag.id}
                      className="inline-flex items-center h-9 px-3.5 rounded-full border border-hairline text-sm text-muted cursor-pointer select-none has-checked:border-accent has-checked:text-accent-bright has-checked:bg-accent/10"
                    >
                      <input
                        type="checkbox"
                        name="aroma_tags"
                        value={tag.id}
                        className="sr-only"
                      />
                      {tag.name}
                    </label>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-[21px] font-semibold">기타</h2>
        <textarea
          name="comment"
          rows={3}
          className={textareaClass}
          placeholder="총평 — 전체적인 인상, 함께한 사람, 그날의 기분"
        />
        <div className="grid grid-cols-2 gap-3">
          <Field label="페어링" htmlFor="pairing">
            <input
              id="pairing"
              name="pairing"
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
                  className="sr-only"
                />
                {BUY_AGAIN_LABELS[key]}
              </label>
            ))}
          </div>
        </div>
      </section>

      {state.error && <p className="text-danger text-sm">{state.error}</p>}
      <SubmitButton pending={pending}>노트 저장</SubmitButton>
    </form>
  );
}
