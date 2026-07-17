'use client';

import { useActionState } from 'react';
import { createBottle, updateBottle, type FormState } from '../actions';
import { Field, inputClass, SubmitButton } from '@/components/form';
import type { Bottle } from '@/lib/types';

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
}: {
  whiskies: { id: string; name: string }[];
  defaultWhiskyId?: string;
  initial?: Bottle;
}) {
  const isEdit = initial != null;
  const [state, action, pending] = useActionState<FormState, FormData>(
    isEdit ? updateBottle : createBottle,
    {}
  );

  return (
    <form action={action} className="space-y-4">
      {isEdit && <input type="hidden" name="id" value={initial.id} />}

      <Field label="위스키" htmlFor="whisky_id" required>
        <select
          id="whisky_id"
          name="whisky_id"
          required
          defaultValue={initial?.whisky_id ?? defaultWhiskyId ?? ''}
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
        </select>
      </Field>

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
            defaultValue={initial?.purchase_price ?? ''}
            className={inputClass}
            placeholder="120000"
          />
        </Field>
      </div>

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

      <Field
        label={isEdit ? '개봉일' : '개봉일 (이미 개봉했다면)'}
        htmlFor="open_date"
      >
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
