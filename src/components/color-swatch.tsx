import { WHISKY_COLORS, whiskyColor } from '@/lib/types';

/** 시음 폼의 위스키 색상 선택 — 순수 radio + has-checked 스타일 (훅 불필요) */
export function ColorSwatchPicker({ defaultValue }: { defaultValue?: string | null }) {
  return (
    <div className="flex flex-wrap gap-2.5">
      <label
        className="flex flex-col items-center gap-1 cursor-pointer select-none has-checked:[&_span:first-of-type]:ring-2"
        title="기록 안 함"
      >
        <input
          type="radio"
          name="color"
          value=""
          defaultChecked={!defaultValue}
          className="sr-only"
        />
        <span className="w-8 h-8 rounded-full border border-hairline ring-accent-bright ring-offset-2 ring-offset-canvas flex items-center justify-center text-faint text-xs">
          ×
        </span>
        <span className="text-[10px] text-faint">없음</span>
      </label>
      {WHISKY_COLORS.map((color) => (
        <label
          key={color.key}
          className="flex flex-col items-center gap-1 cursor-pointer select-none has-checked:[&_span:first-of-type]:ring-2"
          title={color.label}
        >
          <input
            type="radio"
            name="color"
            value={color.key}
            defaultChecked={defaultValue === color.key}
            className="sr-only"
          />
          <span
            className="w-8 h-8 rounded-full ring-accent-bright ring-offset-2 ring-offset-canvas"
            style={{ backgroundColor: color.hex }}
          />
          <span className="text-[10px] text-faint whitespace-nowrap">{color.label}</span>
        </label>
      ))}
    </div>
  );
}

/** 노트 상세 등에서 색상 표시 */
export function ColorDot({ colorKey }: { colorKey: string | null }) {
  const color = whiskyColor(colorKey);
  if (!color) return null;
  return (
    <span className="inline-flex items-center gap-2 text-sm text-muted">
      <span
        className="w-4 h-4 rounded-full border border-hairline-soft"
        style={{ backgroundColor: color.hex }}
      />
      {color.label}
    </span>
  );
}
