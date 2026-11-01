'use client';

import { useActionState } from 'react';
import { createFlight, revealGlass, type FormState } from './actions';
import { Field, inputClass, SubmitButton } from '@/components/form';
import { WhiskyPicker, type PickerWhisky } from '@/components/whisky-picker';

export function NewFlightForm({ today }: { today: string }) {
  const [state, action, pending] = useActionState<FormState, FormData>(createFlight, {});
  return (
    <form action={action} className="space-y-4">
      <Field label="이름" htmlFor="flight_name" required>
        <input
          id="flight_name"
          name="name"
          required
          className={inputClass}
          placeholder="예: 아일라 피트 비교, 셰리 캐스크 블라인드"
        />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="날짜" htmlFor="flight_date" required>
          <input
            id="flight_date"
            name="tasted_at"
            type="date"
            required
            defaultValue={today}
            className={inputClass}
          />
        </Field>
        <Field label="장소" htmlFor="flight_location">
          <input
            id="flight_location"
            name="location"
            className={inputClass}
            placeholder="예: 집, OO바"
          />
        </Field>
      </div>
      <label className="flex items-start gap-3 cursor-pointer">
        <input type="checkbox" name="blind" className="mt-1 w-4 h-4 accent-(--color-accent)" />
        <span>
          <span className="block text-sm">블라인드</span>
          <span className="block text-xs text-faint mt-0.5">
            잔을 위스키 없이 번호로 기록하고, 다 마신 뒤 공개합니다. 추측도 남길 수 있습니다.
          </span>
        </span>
      </label>
      {state.error && <p className="text-danger text-sm">{state.error}</p>}
      <SubmitButton pending={pending}>플라이트 시작</SubmitButton>
    </form>
  );
}

/** 공개 전 블라인드 잔에 위스키를 연결 */
export function RevealForm({
  tastingId,
  flightId,
  whiskies,
}: {
  tastingId: string;
  flightId: string;
  whiskies: PickerWhisky[];
}) {
  const [state, action, pending] = useActionState<FormState, FormData>(revealGlass, {});
  return (
    <form action={action} className="space-y-2">
      <input type="hidden" name="tasting_id" value={tastingId} />
      <input type="hidden" name="flight_id" value={flightId} />
      <WhiskyPicker whiskies={whiskies} />
      {state.error && <p className="text-danger text-xs">{state.error}</p>}
      <button
        type="submit"
        disabled={pending}
        className="h-9 w-full rounded-full bg-accent text-on-accent text-sm font-semibold disabled:opacity-50"
      >
        {pending ? '공개 중…' : '공개'}
      </button>
    </form>
  );
}
