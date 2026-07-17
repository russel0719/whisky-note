'use client';

import { useMemo, useState } from 'react';
import {
  AROMA_GROUPS,
  AROMA_GROUP_LABELS,
  type AromaGroup,
  type AromaTag,
} from '@/lib/types';

/** 그룹별 휠 색상 — 아로마 휠 관례(과일=옐로, 셰리=와인, 이탄=올리브 등)를 다크 무드로 뮤트 */
const GROUP_COLORS: Record<AromaGroup, string> = {
  fruit: '#e0b84a',
  floral: '#c08599',
  sweet: '#cf9440',
  cereal: '#b99a58',
  peat: '#85845f',
  sherry: '#9c4038',
  wood: '#8a5a2e',
  spice: '#b06030',
  other: '#75828c',
};

const SIZE = 500;
const C = SIZE / 2;
const R_HOLE = 62;
const R_GROUP = 112;
const R_TAG = 236;

function polar(r: number, deg: number): [number, number] {
  const rad = ((deg - 90) * Math.PI) / 180; // 0° = 12시 방향
  return [C + r * Math.cos(rad), C + r * Math.sin(rad)];
}

function annularSector(r0: number, r1: number, a0: number, a1: number): string {
  const large = a1 - a0 > 180 ? 1 : 0;
  const [x0, y0] = polar(r1, a0);
  const [x1, y1] = polar(r1, a1);
  const [x2, y2] = polar(r0, a1);
  const [x3, y3] = polar(r0, a0);
  return `M ${x0} ${y0} A ${r1} ${r1} 0 ${large} 1 ${x1} ${y1} L ${x2} ${y2} A ${r0} ${r0} 0 ${large} 0 ${x3} ${y3} Z`;
}

/** 사방에서 읽히도록 라벨을 방사형으로 회전 (표준 선버스트 라벨링) */
function radialRotation(mid: number): number {
  return mid < 180 ? mid - 90 : mid + 90;
}

export function AromaWheelPicker({
  aromaTags,
  defaultSelected = [],
}: {
  aromaTags: AromaTag[];
  defaultSelected?: number[];
}) {
  const [selected, setSelected] = useState<Set<number>>(new Set(defaultSelected));

  const groups = useMemo(
    () =>
      AROMA_GROUPS.map((grp) => ({
        grp,
        tags: aromaTags.filter((t) => t.grp === grp),
      })).filter((g) => g.tags.length > 0),
    [aromaTags]
  );
  const total = groups.reduce((sum, g) => sum + g.tags.length, 0);
  if (total === 0) return null;
  const anglePer = 360 / total;

  function toggle(id: number) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  let cursor = 0;
  const segments = groups.map(({ grp, tags }) => {
    const start = cursor;
    const end = cursor + tags.length * anglePer;
    cursor = end;
    return { grp, tags, start, end };
  });

  const selectedTags = aromaTags.filter((t) => selected.has(t.id));

  return (
    <div>
      {/* 폼 제출/스크린리더용 실제 체크박스 */}
      <div className="sr-only">
        {aromaTags.map((tag) => (
          <label key={tag.id}>
            <input
              type="checkbox"
              name="aroma_tags"
              value={tag.id}
              checked={selected.has(tag.id)}
              onChange={() => toggle(tag.id)}
            />
            {AROMA_GROUP_LABELS[tag.grp]} · {tag.name}
          </label>
        ))}
      </div>

      <svg
        viewBox={`0 0 ${SIZE} ${SIZE}`}
        className="w-full max-w-[440px] mx-auto block select-none"
        aria-hidden
      >
        {segments.map(({ grp, tags, start, end }) => {
          const color = GROUP_COLORS[grp];
          const groupMid = (start + end) / 2;
          const [gx, gy] = polar((R_HOLE + R_GROUP) / 2, groupMid);
          return (
            <g key={grp}>
              {/* 그룹(안쪽 링) */}
              <path
                d={annularSector(R_HOLE, R_GROUP, start, end)}
                fill={color}
                fillOpacity={0.32}
                stroke="var(--color-canvas)"
                strokeWidth="2"
              />
              <text
                x={gx}
                y={gy}
                transform={`rotate(${radialRotation(groupMid)}, ${gx}, ${gy})`}
                textAnchor="middle"
                dominantBaseline="middle"
                fill="var(--color-ink)"
                fontSize="14"
                fontWeight="600"
              >
                {AROMA_GROUP_LABELS[grp]}
              </text>
              {/* 태그(바깥 링) */}
              {tags.map((tag, i) => {
                const a0 = start + i * anglePer;
                const a1 = a0 + anglePer;
                const mid = (a0 + a1) / 2;
                const [tx, ty] = polar((R_GROUP + R_TAG) / 2, mid);
                const isOn = selected.has(tag.id);
                return (
                  <g
                    key={tag.id}
                    onClick={() => toggle(tag.id)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        toggle(tag.id);
                      }
                    }}
                    tabIndex={0}
                    role="checkbox"
                    aria-checked={isOn}
                    aria-label={tag.name}
                    className="cursor-pointer focus:outline-none"
                  >
                    <path
                      d={annularSector(R_GROUP, R_TAG, a0, a1)}
                      fill={color}
                      fillOpacity={isOn ? 0.9 : 0.14}
                      stroke={isOn ? 'var(--color-accent-bright)' : 'var(--color-canvas)'}
                      strokeWidth={isOn ? 1.5 : 2}
                    />
                    <text
                      x={tx}
                      y={ty}
                      transform={`rotate(${radialRotation(mid)}, ${tx}, ${ty})`}
                      textAnchor="middle"
                      dominantBaseline="middle"
                      fill={isOn ? '#241d15' : 'var(--color-muted)'}
                      fontSize="11.5"
                      fontWeight={isOn ? 600 : 400}
                      style={{ pointerEvents: 'none' }}
                    >
                      {tag.name}
                    </text>
                    <title>{`${AROMA_GROUP_LABELS[tag.grp]} · ${tag.name}`}</title>
                  </g>
                );
              })}
            </g>
          );
        })}
        {/* 중앙 */}
        <circle cx={C} cy={C} r={R_HOLE - 6} fill="var(--color-tile-2)" />
        <text
          x={C}
          y={C - 8}
          textAnchor="middle"
          fill="var(--color-accent-bright)"
          fontSize="22"
          fontWeight="600"
          className="tabular-nums"
        >
          {selected.size}
        </text>
        <text x={C} y={C + 14} textAnchor="middle" fill="var(--color-faint)" fontSize="11">
          선택됨
        </text>
      </svg>

      {selectedTags.length > 0 && (
        <div className="flex flex-wrap gap-2 mt-4">
          {selectedTags.map((tag) => (
            <button
              key={tag.id}
              type="button"
              onClick={() => toggle(tag.id)}
              className="inline-flex items-center gap-1.5 h-8 px-3 rounded-full border border-accent/50 text-sm text-accent-bright"
            >
              {tag.name}
              <span aria-hidden className="text-faint">×</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
