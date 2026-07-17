import { whiskyColor } from '@/lib/types';

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
