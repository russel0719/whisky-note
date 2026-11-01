'use client';

import { useActionState, useState } from 'react';
import { priceSummary, type PricePoint } from '@/lib/bottles';
import { formatDate, formatKrw } from '@/lib/format';
import { createBottle, updateBottle, type FormState } from '../actions';
import { Field, inputClass, SubmitButton } from '@/components/form';
import { WhiskyPicker, type PickerWhisky } from '@/components/whisky-picker';
import type { Bottle } from '@/lib/types';

export type PriceHistory = (PricePoint & { id: string; whisky_id: string })[];

function today(): string {
  const d = new Date();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${mm}-${dd}`;
}

export function BottleForm({
  whiskies,
  defaultWhiskyId,
  initial,
  priceHistory = [],
}: {
  whiskies: PickerWhisky[];
  defaultWhiskyId?: string;
  initial?: Bottle;
  /** 위스키별 지난 구매 — 구매가 입력 시 비교 */
  priceHistory?: PriceHistory;
}) {
  const isEdit = initial != null;
  const [state, action, pending] = useActionState<FormState, FormData>(
    isEdit ? updateBottle : createBottle,
    {}
  );
  const [whiskyId, setWhiskyId] = useState(initial?.whisky_id ?? defaultWhiskyId ?? '');
  const [price, setPrice] = useState(
    initial?.purchase_price != null ? String(initial.purchase_price) : ''
  );
  const history = priceSummary(
    priceHistory.filter((p) => p.whisky_id === whiskyId && p.id !== initial?.id)
  );
  const diff = history && price ? Number(price) - history.last.purchase_price : null;

  return (
    <form action={action} className="space-y-4">
      {isEdit && <input type="hidden" name="id" value={initial.id} />}

      <div>
        <p className="text-sm text-muted mb-1.5">
          위스키 <span className="text-accent">*</span>
        </p>
        <WhiskyPicker
          whiskies={whiskies}
          defaultWhiskyId={initial?.whisky_id ?? defaultWhiskyId}
          allowCreate={!isEdit}
          onChange={(id) => setWhiskyId(id ?? '')}
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Field label="구매일" htmlFor="purchase_date" required>
          <input
            id="purchase_date"
            name="purchase_date"
            type="date"
            required
            defaultValue={initial?.purchase_date?.slice(0, 10) ?? today()}
            className={inputClass}
          />
        </Field>
        <Field label="구매가 (원)" htmlFor="purchase_price">
          <input
            id="purchase_price"
            name="purchase_price"
            type="number"
            min="0"
            step="100"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            className={inputClass}
            placeholder={history ? String(history.last.purchase_price) : '120000'}
          />
        </Field>
      </div>

      {history && (
        <p className="text-xs text-faint -mt-1">
          지난 구매 {formatDate(history.last.purchase_date)}
          {history.last.purchase_place ? ` · ${history.last.purchase_place}` : ''} ·{' '}
          {formatKrw(history.last.purchase_price)}
          {history.count > 1 && ` (최저 ${formatKrw(history.min)})`}
          {diff != null && diff !== 0 && (
            <span className={diff > 0 ? 'text-danger' : 'text-accent-bright'}>
              {' '}
              — 지난번보다 {formatKrw(Math.abs(diff))} {diff > 0 ? '비쌈' : '저렴'}
            </span>
          )}
        </p>
      )}

      <div className="grid grid-cols-2 gap-3">
        <Field label="구매처" htmlFor="purchase_place">
          <input
            id="purchase_place"
            name="purchase_place"
            defaultValue={initial?.purchase_place ?? ''}
            className={inputClass}
            placeholder="예: 데일리샷"
          />
        </Field>
        <Field label="용량 (ml)" htmlFor="size_ml">
          <input
            id="size_ml"
            name="size_ml"
            type="number"
            min="1"
            defaultValue={initial?.size_ml ?? 700}
            className={inputClass}
          />
        </Field>
      </div>

      <Field label={isEdit ? '개봉일' : '개봉일 (이미 개봉했다면)'} htmlFor="open_date">
        <input
          id="open_date"
          name="open_date"
          type="date"
          defaultValue={initial?.open_date?.slice(0, 10) ?? ''}
          className={inputClass}
        />
      </Field>

      {state.error && <p className="text-danger text-sm">{state.error}</p>}
      <SubmitButton pending={pending}>{isEdit ? '변경 사항 저장' : '기록 저장'}</SubmitButton>
    </form>
  );
}
