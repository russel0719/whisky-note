'use client';

import { useState, useTransition } from 'react';
import {
  deleteBottle,
  finishBottle,
  openBottle,
  updateOpenDate,
  updateRemaining,
} from './actions';
import type { Bottle } from '@/lib/types';

function today(): string {
  const d = new Date();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${mm}-${dd}`;
}

export function BottleControls({ bottle }: { bottle: Bottle }) {
  const [remaining, setRemaining] = useState(bottle.remaining_pct);
  const [, startTransition] = useTransition();

  const dateInputClass =
    'h-9 px-2.5 rounded-(--radius-utility) bg-tile-2 border border-hairline text-sm';

  if (bottle.status === 'unopened') {
    return (
      <div className="flex items-center justify-between gap-3 mt-4 pt-4 border-t border-hairline-soft">
        <form action={openBottle} className="flex items-center gap-2">
          <input type="hidden" name="id" value={bottle.id} />
          <input
            type="date"
            name="open_date"
            defaultValue={today()}
            required
            className={dateInputClass}
            aria-label="개봉일"
          />
          <button
            type="submit"
            className="h-9 px-4 rounded-full bg-accent text-on-accent text-sm font-semibold"
          >
            개봉
          </button>
        </form>
        <DeleteButton id={bottle.id} />
      </div>
    );
  }

  if (bottle.status === 'finished') {
    return (
      <div className="flex justify-end mt-4 pt-4 border-t border-hairline-soft">
        <DeleteButton id={bottle.id} />
      </div>
    );
  }

  return (
    <div className="mt-4 pt-4 border-t border-hairline-soft space-y-3">
      <div className="flex items-center gap-3">
        <label className="text-sm text-muted shrink-0" htmlFor={`open-date-${bottle.id}`}>
          개봉일
        </label>
        <input
          id={`open-date-${bottle.id}`}
          type="date"
          defaultValue={bottle.open_date ?? ''}
          className={dateInputClass}
          onChange={(e) => {
            const value = e.target.value;
            if (value) startTransition(() => updateOpenDate(bottle.id, value));
          }}
        />
      </div>
      <div className="flex items-center gap-3">
        <label className="text-sm text-muted shrink-0" htmlFor={`remaining-${bottle.id}`}>
          잔량
        </label>
        <input
          id={`remaining-${bottle.id}`}
          type="range"
          min={0}
          max={100}
          step={5}
          value={remaining}
          className="flex-1"
          onChange={(e) => setRemaining(Number(e.target.value))}
          onPointerUp={() => startTransition(() => updateRemaining(bottle.id, remaining))}
          onKeyUp={() => startTransition(() => updateRemaining(bottle.id, remaining))}
        />
        <span className="text-sm text-accent-bright tabular-nums w-11 text-right">
          {remaining}%
        </span>
      </div>
      <div className="flex items-center justify-between">
        <form action={finishBottle}>
          <input type="hidden" name="id" value={bottle.id} />
          <button type="submit" className="text-sm text-muted underline underline-offset-4">
            공병 처리
          </button>
        </form>
        <DeleteButton id={bottle.id} />
      </div>
    </div>
  );
}

function DeleteButton({ id }: { id: string }) {
  return (
    <form
      action={deleteBottle}
      onSubmit={(e) => {
        if (!confirm('이 보틀 기록을 삭제할까요?')) e.preventDefault();
      }}
    >
      <input type="hidden" name="id" value={id} />
      <button type="submit" className="text-danger text-sm">
        삭제
      </button>
    </form>
  );
}
