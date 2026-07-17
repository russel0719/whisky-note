'use client';

import { useState } from 'react';
import { ColorDot } from './color-swatch';
import { hexToRgb, whiskyColor, WHISKY_COLORS } from '@/lib/types';

const STEPS = 1000; // 연속에 가까운 해상도

function toHex(n: number): string {
  return Math.round(n).toString(16).padStart(2, '0');
}

/** 그라디언트 위치 t(0~1)의 색 — 인접 기준점 사이 선형 보간 */
function colorAt(t: number): string {
  const seg = Math.max(0, Math.min(1, t)) * (WHISKY_COLORS.length - 1);
  const i = Math.min(Math.floor(seg), WHISKY_COLORS.length - 2);
  const f = seg - i;
  const [r1, g1, b1] = hexToRgb(WHISKY_COLORS[i].hex);
  const [r2, g2, b2] = hexToRgb(WHISKY_COLORS[i + 1].hex);
  return `#${toHex(r1 + (r2 - r1) * f)}${toHex(g1 + (g2 - g1) * f)}${toHex(b1 + (b2 - b1) * f)}`;
}

/** 저장된 값(hex/key)에서 슬라이더 위치 복원 — 가장 가까운 기준점 근사 */
function positionOf(value: string | null | undefined): number | null {
  const resolved = whiskyColor(value);
  if (!resolved) return null;
  const [r, g, b] = hexToRgb(resolved.hex);
  let bestIndex = 0;
  let bestDist = Infinity;
  for (let i = 0; i < WHISKY_COLORS.length; i++) {
    const [sr, sg, sb] = hexToRgb(WHISKY_COLORS[i].hex);
    const dist = (r - sr) ** 2 + (g - sg) ** 2 + (b - sb) ** 2;
    if (dist < bestDist) {
      bestDist = dist;
      bestIndex = i;
    }
  }
  return bestIndex / (WHISKY_COLORS.length - 1);
}

/**
 * 위스키 컬러 바 피커 — 연속 그라디언트에서 아무 지점이나 드래그로 선택.
 * 저장 값은 보간된 hex(#rrggbb), 라벨은 가장 가까운 단계명으로만 표시한다.
 */
export function ColorBarPicker({ defaultValue }: { defaultValue?: string | null }) {
  const [pos, setPos] = useState<number | null>(() => positionOf(defaultValue));
  // 드래그 전에는 저장된 원본 hex를 그대로 보존한다 (위치 복원은 근사이므로)
  const [touched, setTouched] = useState(false);

  const savedHex = whiskyColor(defaultValue)?.hex ?? null;
  const hex = touched ? (pos != null ? colorAt(pos) : null) : savedHex;
  const resolved = whiskyColor(hex);

  const gradient = `linear-gradient(to right, ${WHISKY_COLORS.map((c) => c.hex).join(', ')})`;

  return (
    <div>
      <input type="hidden" name="color" value={hex ?? ''} />
      <div
        className="relative h-12 rounded-full border border-hairline overflow-hidden"
        style={{ background: gradient }}
      >
        <input
          type="range"
          min={0}
          max={STEPS}
          step={1}
          value={Math.round((pos ?? 0.5) * STEPS)}
          onChange={(e) => {
            setPos(Number(e.target.value) / STEPS);
            setTouched(true);
          }}
          className={`color-range absolute inset-0 w-full ${hex == null ? 'opacity-50' : ''}`}
          aria-label="위스키 색상"
          aria-valuetext={resolved?.label ?? '기록 안 함'}
        />
      </div>
      <div className="flex items-center justify-between mt-2 min-h-6">
        {hex ? (
          <ColorDot colorKey={hex} />
        ) : (
          <span className="text-sm text-faint">바를 드래그해서 색을 선택하세요</span>
        )}
        {hex && (
          <button
            type="button"
            onClick={() => {
              setPos(null);
              setTouched(true);
            }}
            className="text-faint text-xs"
            aria-label="색상 선택 지우기"
          >
            지움
          </button>
        )}
      </div>
    </div>
  );
}
