'use client';

import { useState } from 'react';
import { ColorDot } from './color-swatch';
import { WHISKY_COLORS } from '@/lib/types';

/**
 * 위스키 컬러 바 피커 — 12단계 팔레트를 연속 그라디언트로 펼치고,
 * 드래그하면 가장 가까운 단계에 스냅되어 라벨이 표시된다.
 * 저장 값은 기존과 동일한 팔레트 key (hidden input "color").
 */
export function ColorBarPicker({ defaultValue }: { defaultValue?: string | null }) {
  const initialIndex = WHISKY_COLORS.findIndex((c) => c.key === defaultValue);
  const [index, setIndex] = useState<number | null>(initialIndex >= 0 ? initialIndex : null);
  const selected = index != null ? WHISKY_COLORS[index] : null;

  const gradient = `linear-gradient(to right, ${WHISKY_COLORS.map((c) => c.hex).join(', ')})`;

  return (
    <div>
      <input type="hidden" name="color" value={selected?.key ?? ''} />
      <div
        className="relative h-12 rounded-full border border-hairline overflow-hidden"
        style={{ background: gradient }}
      >
        <input
          type="range"
          min={0}
          max={WHISKY_COLORS.length - 1}
          step={1}
          value={index ?? Math.floor(WHISKY_COLORS.length / 2)}
          onChange={(e) => setIndex(Number(e.target.value))}
          className={`color-range absolute inset-0 w-full ${index == null ? 'opacity-50' : ''}`}
          aria-label="위스키 색상"
          aria-valuetext={selected?.label ?? '기록 안 함'}
        />
      </div>
      <div className="flex items-center justify-between mt-2 min-h-6">
        {selected ? (
          <ColorDot colorKey={selected.key} />
        ) : (
          <span className="text-sm text-faint">바를 드래그해서 색을 선택하세요</span>
        )}
        {selected && (
          <button
            type="button"
            onClick={() => setIndex(null)}
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
