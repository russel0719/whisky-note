import { ImageResponse } from 'next/og';
import { whiskyColor } from '@/lib/types';

/** 공유 카드 크기 — 4:5 (인스타그램 피드 세로형) */
export const CARD_WIDTH = 1080;
export const CARD_HEIGHT = 1350;

export interface ShareCardData {
  name: string;
  date: string;
  meta: string[];
  score: number | null;
  stages: { label: string; score: number | null }[];
  descriptors: string[];
  aromas: string[];
  comment: string | null;
  color: string | null;
}

// 디자인 토큰 (globals.css @theme와 동일 값 — ImageResponse는 CSS 변수를 못 쓴다)
const C = {
  canvas: '#1a1714',
  tile: '#211d19',
  ink: '#f4efe8',
  muted: '#a89e91',
  hairline: 'rgba(244,239,232,0.12)',
  accent: '#c9963f',
  accentBright: '#e3b563',
  gold: '#f2d08a',
};

function scoreColor(score: number | null): string {
  if (score == null) return C.muted;
  if (score >= 90) return C.gold;
  if (score >= 80) return C.accentBright;
  if (score >= 70) return C.ink;
  return C.muted;
}

// 한글 글리프가 필요해 Pretendard를 CDN에서 받는다 (서버리스 인스턴스당 한 번)
const FONT_BASE = 'https://cdn.jsdelivr.net/npm/pretendard@1.3.9/dist/public/static';
let fontsPromise: Promise<{ name: string; data: ArrayBuffer; weight: 300 | 400 | 600 }[]> | null =
  null;
function loadFonts() {
  fontsPromise ??= Promise.all(
    (
      [
        ['Light', 300],
        ['Regular', 400],
        ['SemiBold', 600],
      ] as const
    ).map(async ([file, weight]) => {
      const res = await fetch(`${FONT_BASE}/Pretendard-${file}.otf`);
      if (!res.ok) throw new Error(`font ${file}: ${res.status}`);
      return { name: 'Pretendard', data: await res.arrayBuffer(), weight };
    })
  ).catch((err) => {
    fontsPromise = null; // 다음 요청에서 다시 시도
    throw err;
  });
  return fontsPromise;
}

function Chip({ children, accent }: { children: string; accent?: boolean }) {
  return (
    <div
      style={{
        display: 'flex',
        padding: '10px 22px',
        borderRadius: 999,
        border: `2px solid ${accent ? 'rgba(201,150,63,0.6)' : C.hairline}`,
        color: accent ? C.accentBright : C.muted,
        fontSize: 28,
      }}
    >
      {children}
    </div>
  );
}

/** 시음 노트 공유 카드 PNG */
export async function renderShareCard(data: ShareCardData): Promise<ImageResponse> {
  const fonts = await loadFonts();
  const glass = whiskyColor(data.color);
  const comment =
    data.comment && data.comment.length > 110 ? `${data.comment.slice(0, 108)}…` : data.comment;

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          padding: 80,
          backgroundColor: C.canvas,
          backgroundImage:
            'radial-gradient(ellipse 70% 50% at 85% 0%, rgba(201,150,63,0.10), rgba(26,23,20,0))',
          color: C.ink,
          fontFamily: 'Pretendard',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', color: C.accent, fontSize: 26, letterSpacing: 8 }}>
            WHISKY NOTE
          </div>
          <div style={{ display: 'flex', color: C.muted, fontSize: 28 }}>{data.date}</div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', marginTop: 72 }}>
          <div
            style={{
              display: 'flex',
              fontSize: data.name.length > 18 ? 68 : 84,
              fontWeight: 600,
              lineHeight: 1.15,
              wordBreak: 'keep-all',
            }}
          >
            {data.name}
          </div>
          {data.meta.length > 0 && (
            <div style={{ display: 'flex', marginTop: 20, color: C.muted, fontSize: 30 }}>
              {data.meta.join('  ·  ')}
            </div>
          )}
        </div>

        <div
          style={{
            display: 'flex',
            alignItems: 'flex-end',
            justifyContent: 'space-between',
            marginTop: 64,
          }}
        >
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <div
              style={{
                display: 'flex',
                fontSize: 260,
                fontWeight: 300,
                lineHeight: 1,
                color: scoreColor(data.score),
                letterSpacing: -8,
              }}
            >
              {data.score ?? '—'}
            </div>
            <div style={{ display: 'flex', gap: 40, marginTop: 24 }}>
              {data.stages.map((s) => (
                <div key={s.label} style={{ display: 'flex', flexDirection: 'column' }}>
                  <div style={{ display: 'flex', color: C.muted, fontSize: 24, letterSpacing: 4 }}>
                    {s.label.toUpperCase()}
                  </div>
                  <div style={{ display: 'flex', fontSize: 44, color: scoreColor(s.score) }}>
                    {s.score ?? '—'}
                  </div>
                </div>
              ))}
            </div>
          </div>
          {glass && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <div
                style={{
                  display: 'flex',
                  width: 150,
                  height: 150,
                  borderRadius: 999,
                  backgroundColor: glass.hex,
                  border: `2px solid ${C.hairline}`,
                }}
              />
              <div style={{ display: 'flex', marginTop: 16, color: C.muted, fontSize: 26 }}>
                {glass.label}
              </div>
            </div>
          )}
        </div>

        {(data.descriptors.length > 0 || data.aromas.length > 0) && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 14, marginTop: 56 }}>
            {data.descriptors.slice(0, 6).map((d) => (
              <Chip key={`d-${d}`}>{d}</Chip>
            ))}
            {data.aromas.slice(0, 8).map((a) => (
              <Chip key={`a-${a}`} accent>
                {a}
              </Chip>
            ))}
          </div>
        )}

        {comment && (
          <div
            style={{
              display: 'flex',
              marginTop: 'auto',
              paddingTop: 40,
              borderTop: `2px solid ${C.hairline}`,
              fontSize: 36,
              lineHeight: 1.5,
              color: C.ink,
              wordBreak: 'keep-all',
            }}
          >
            {comment}
          </div>
        )}
      </div>
    ),
    { width: CARD_WIDTH, height: CARD_HEIGHT, fonts }
  );
}
