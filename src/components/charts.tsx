import { scoreTextClass } from './ui';

/** 점수 밴드 → 스트로크 컬러 (scoreTextClass와 동일 규칙) */
function scoreStroke(score: number | null): string {
  if (score == null) return 'var(--color-faint)';
  if (score >= 90) return 'var(--color-score-gold)';
  if (score >= 80) return 'var(--color-accent-bright)';
  if (score >= 70) return 'var(--color-ink)';
  return 'var(--color-muted)';
}

/**
 * 점수 다이얼 — 0~100을 270° 아크로 표현하는 원형 게이지.
 * 노트 상세/대시보드 히어로의 시그니처 비주얼.
 */
export function ScoreDial({
  value,
  size = 120,
  label,
}: {
  value: number | null;
  size?: number;
  label?: string;
}) {
  const stroke = 7;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const sweep = 0.75; // 270°
  const fraction = value == null ? 0 : Math.max(0, Math.min(100, value)) / 100;

  return (
    <div className="inline-flex flex-col items-center" role="img" aria-label={`${label ?? '점수'} ${value ?? '없음'}`}>
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-[225deg]">
          <circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            stroke="var(--color-hairline)"
            strokeWidth={stroke}
            strokeLinecap="round"
            strokeDasharray={`${c * sweep} ${c}`}
          />
          {value != null && (
            <circle
              cx={size / 2}
              cy={size / 2}
              r={r}
              fill="none"
              stroke={scoreStroke(value)}
              strokeWidth={stroke}
              strokeLinecap="round"
              strokeDasharray={`${c * sweep * fraction} ${c}`}
              style={{ transition: 'stroke-dasharray 0.6s ease-out' }}
            />
          )}
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span
            className={`font-display tabular-nums leading-none ${scoreTextClass(value)}`}
            style={{ fontSize: size * 0.3 }}
          >
            {value ?? '—'}
          </span>
        </div>
      </div>
      {label && <p className="text-xs text-faint mt-1">{label}</p>}
    </div>
  );
}

/**
 * 아로마 레이더 — 9그룹 단일 시리즈. hairline 그리드는 recessive하게,
 * 데이터 면은 앰버 12% + 2px 스트로크, 꼭짓점 마커에 네이티브 title 툴팁.
 */
export function AromaRadar({
  data,
  size = 280,
}: {
  data: { label: string; value: number }[];
  size?: number;
}) {
  const n = data.length;
  if (n < 3) return null;
  const max = Math.max(1, ...data.map((d) => d.value));
  const cx = size / 2;
  const cy = size / 2;
  const rMax = size / 2 - 36;

  const point = (i: number, r: number): [number, number] => {
    const angle = (Math.PI * 2 * i) / n - Math.PI / 2;
    return [cx + r * Math.cos(angle), cy + r * Math.sin(angle)];
  };
  const ring = (fraction: number) =>
    data.map((_, i) => point(i, rMax * fraction).join(',')).join(' ');
  const dataPoints = data.map((d, i) => point(i, (rMax * d.value) / max));

  return (
    <svg
      viewBox={`0 0 ${size} ${size}`}
      className="w-full max-w-[320px] mx-auto"
      role="img"
      aria-label={`아로마 프로필: ${data.map((d) => `${d.label} ${d.value}`).join(', ')}`}
    >
      {[1 / 3, 2 / 3, 1].map((f) => (
        <polygon
          key={f}
          points={ring(f)}
          fill="none"
          stroke="var(--color-hairline-soft)"
          strokeWidth="1"
        />
      ))}
      {data.map((_, i) => {
        const [x, y] = point(i, rMax);
        return (
          <line
            key={i}
            x1={cx}
            y1={cy}
            x2={x}
            y2={y}
            stroke="var(--color-hairline-soft)"
            strokeWidth="1"
          />
        );
      })}
      <polygon
        points={dataPoints.map((p) => p.join(',')).join(' ')}
        fill="var(--color-accent)"
        fillOpacity="0.12"
        stroke="var(--color-accent)"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      {dataPoints.map(([x, y], i) => (
        <circle key={i} cx={x} cy={y} r="4" fill="var(--color-accent-bright)">
          <title>{`${data[i].label}: ${data[i].value}`}</title>
        </circle>
      ))}
      {data.map((d, i) => {
        const [x, y] = point(i, rMax + 18);
        return (
          <text
            key={d.label}
            x={x}
            y={y}
            textAnchor="middle"
            dominantBaseline="middle"
            fill="var(--color-muted)"
            fontSize="11"
          >
            {d.label}
          </text>
        );
      })}
    </svg>
  );
}

/**
 * 보틀 실루엣 잔량 게이지 — 잔량(pct)만큼 아래에서 위로 채운다.
 * CSS clip-path(inset)만 사용해 SVG defs id 충돌을 피한다.
 */
export function BottleGauge({ pct, height = 72 }: { pct: number; height?: number }) {
  const clamped = Math.max(0, Math.min(100, pct));
  const bottlePath =
    'M13 2h6v3.5l-.5 1v4c3.2 1.8 5.5 4.6 5.5 8.5V38a3 3 0 0 1-3 3H11a3 3 0 0 1-3-3V19c0-3.9 2.3-6.7 5.5-8.5v-4l-.5-1V2Z';

  return (
    <div
      className="inline-flex items-end gap-2"
      role="img"
      aria-label={`잔량 ${clamped}%`}
      title={`잔량 ${clamped}%`}
    >
      <svg viewBox="0 0 32 44" style={{ height }} className="shrink-0">
        <path
          d={bottlePath}
          fill="var(--color-accent)"
          style={{ clipPath: `inset(${100 - clamped}% 0 0 0)` }}
          opacity="0.85"
        />
        <path
          d={bottlePath}
          fill="none"
          stroke="var(--color-hairline)"
          strokeWidth="1.5"
        />
      </svg>
      <span className="text-sm text-muted tabular-nums">{clamped}%</span>
    </div>
  );
}

/**
 * 월별 막대 차트 — 단일 시리즈(앰버), 4px 라운드 데이터 엔드, 마커 title 툴팁.
 * 값 라벨은 최대값에만 직접 표기 (selective direct label).
 */
export function MonthlyBars({
  data,
  format = (v: number) => String(v),
}: {
  data: { label: string; value: number; title?: string }[];
  format?: (v: number) => string;
}) {
  const max = Math.max(1, ...data.map((d) => d.value));
  return (
    <div className="flex items-end gap-[6px] h-36" role="img" aria-label="월별 차트">
      {data.map((d) => {
        const h = Math.round((d.value / max) * 100);
        const isMax = d.value === max && d.value > 0;
        return (
          <div key={d.label} className="flex-1 flex flex-col items-center gap-1 min-w-0">
            {isMax && (
              <span className="text-[10px] text-accent-bright tabular-nums whitespace-nowrap">
                {format(d.value)}
              </span>
            )}
            <div
              className="w-full rounded-t-[4px] bg-accent"
              style={{ height: `${Math.max(h, d.value > 0 ? 4 : 0)}%`, opacity: isMax ? 1 : 0.65 }}
              title={d.title ?? `${d.label}: ${format(d.value)}`}
            />
            <span className="text-[10px] text-faint whitespace-nowrap">{d.label}</span>
          </div>
        );
      })}
    </div>
  );
}

/**
 * 개봉 경과 × 점수 라인 차트 — 한 보틀의 시음 점수를 개봉 후 경과일 축으로.
 * 단일 시리즈, 2px 라인, 8px 마커 + title 툴팁, recessive 그리드.
 */
export function OpenAgeChart({
  points,
  width = 560,
  height = 150,
}: {
  points: { days: number; score: number; date: string }[];
  width?: number;
  height?: number;
}) {
  if (points.length < 2) return null;
  const sorted = [...points].sort((a, b) => a.days - b.days);
  const padX = 34;
  const padY = 18;
  const maxDays = Math.max(...sorted.map((p) => p.days), 1);
  const scores = sorted.map((p) => p.score);
  const yMin = Math.max(0, Math.min(...scores) - 5);
  const yMax = Math.min(100, Math.max(...scores) + 5);
  const x = (days: number) => padX + (days / maxDays) * (width - padX * 2);
  const y = (score: number) =>
    height - padY - ((score - yMin) / (yMax - yMin || 1)) * (height - padY * 2);

  const gridScores = [yMin, (yMin + yMax) / 2, yMax].map(Math.round);

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      className="w-full"
      role="img"
      aria-label={`개봉 경과에 따른 점수: ${sorted
        .map((p) => `${p.days}일차 ${p.score}점`)
        .join(', ')}`}
    >
      {gridScores.map((s) => (
        <g key={s}>
          <line
            x1={padX}
            y1={y(s)}
            x2={width - padX}
            y2={y(s)}
            stroke="var(--color-hairline-soft)"
            strokeWidth="1"
          />
          <text
            x={padX - 6}
            y={y(s)}
            textAnchor="end"
            dominantBaseline="middle"
            fill="var(--color-faint)"
            fontSize="10"
          >
            {s}
          </text>
        </g>
      ))}
      <polyline
        points={sorted.map((p) => `${x(p.days)},${y(p.score)}`).join(' ')}
        fill="none"
        stroke="var(--color-accent)"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {sorted.map((p, i) => (
        <circle key={i} cx={x(p.days)} cy={y(p.score)} r="4" fill="var(--color-accent-bright)">
          <title>{`개봉 ${p.days}일차 (${p.date}): ${p.score}점`}</title>
        </circle>
      ))}
      {sorted.map((p, i) =>
        i === 0 || i === sorted.length - 1 ? (
          <text
            key={`label-${i}`}
            x={x(p.days)}
            y={height - 4}
            textAnchor="middle"
            fill="var(--color-faint)"
            fontSize="10"
          >
            {p.days}일차
          </text>
        ) : null
      )}
    </svg>
  );
}

/** 점수 추이 스파크라인 — 단일 시리즈, 2px 라인 + 마지막 점 강조 */
export function Sparkline({
  values,
  width = 120,
  height = 36,
}: {
  values: number[];
  width?: number;
  height?: number;
}) {
  if (values.length < 2) return null;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const pad = 4;
  const points = values.map((v, i) => {
    const x = pad + (i * (width - pad * 2)) / (values.length - 1);
    const y = height - pad - ((v - min) / range) * (height - pad * 2);
    return [x, y] as const;
  });
  const last = points[points.length - 1];

  return (
    <svg
      width={width}
      height={height}
      role="img"
      aria-label={`점수 추이: ${values.join(', ')}`}
    >
      <polyline
        points={points.map((p) => p.join(',')).join(' ')}
        fill="none"
        stroke="var(--color-accent)"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx={last[0]} cy={last[1]} r="3.5" fill="var(--color-accent-bright)">
        <title>{`최근 ${values[values.length - 1]}점`}</title>
      </circle>
    </svg>
  );
}
