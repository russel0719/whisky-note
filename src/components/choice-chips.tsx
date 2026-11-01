'use client';

import { useState } from 'react';

export const chipClass =
  'inline-flex items-center h-9 px-4 rounded-full border text-sm cursor-pointer select-none transition-colors active:scale-95';
const chipOff = 'border-hairline text-muted';
const chipOn = 'border-accent text-accent-bright bg-accent/10';

/**
 * 선택지 칩 그룹. single은 다시 누르면 선택 해제(라디오와 달리 비울 수 있음),
 * multi는 체크박스처럼 토글. 값은 hidden input으로 폼에 제출된다.
 */
export function ChoiceChips<T extends string>({
  label,
  name,
  options,
  multiple = false,
  defaultValue = [],
}: {
  label: string;
  name: string;
  options: Record<T, string>;
  multiple?: boolean;
  defaultValue?: T[];
}) {
  const [selected, setSelected] = useState<T[]>(defaultValue);

  function toggle(key: T) {
    setSelected((prev) => {
      if (prev.includes(key)) return prev.filter((k) => k !== key);
      return multiple ? [...prev, key] : [key];
    });
  }

  return (
    <div role="group" aria-label={label}>
      <p className="text-sm text-muted mb-2">
        {label}
        {multiple && <span className="text-faint text-xs"> (여러 개 선택)</span>}
      </p>
      <div className="flex flex-wrap gap-2">
        {(Object.keys(options) as T[]).map((key) => {
          const on = selected.includes(key);
          return (
            <button
              key={key}
              type="button"
              aria-pressed={on}
              onClick={() => toggle(key)}
              className={`${chipClass} ${on ? chipOn : chipOff}`}
            >
              {options[key]}
            </button>
          );
        })}
      </div>
      {selected.map((key) => (
        <input key={key} type="hidden" name={name} value={key} />
      ))}
    </div>
  );
}
