'use server';

import { CATEGORIES, type Category } from '@/lib/types';

// Cerebras Inference — OpenAI 호환 API. gpt-oss-120b free tier: 5 req/분, 30K 토큰/분, 1M 토큰/일
const CEREBRAS_API_URL = 'https://api.cerebras.ai/v1/chat/completions';
const MODEL = 'gpt-oss-120b';

export interface RateLimitBucket {
  /** 예: "requests-day", "tokens-minute" */
  name: string;
  limit: number | null;
  remaining: number | null;
  /** 리셋까지 남은 시간(초) */
  reset: number | null;
}

export interface WhiskyLookupResult {
  error?: string;
  fields?: {
    name: string;
    distillery: string | null;
    category: Category | null;
    region: string | null;
    abv: number | null;
    age_years: number | null;
    cask_type: string | null;
  };
  confidence?: 'high' | 'medium' | 'low';
  note?: string;
  usage?: { prompt: number; completion: number; total: number };
  rateLimits?: RateLimitBucket[];
}

const SYSTEM_PROMPT = `당신은 위스키 데이터베이스 전문가다. 사용자가 준 위스키 이름에 대해 알려진 공식 정보를 JSON 하나로만 답한다.
스키마:
{
  "name": "정식 제품명 (영문)",
  "distillery": "증류소 또는 브랜드" 또는 null,
  "category": "single_malt" | "blended" | "blended_malt" | "grain" | "bourbon" | "rye" | "irish" | "japanese" | "other" 또는 null,
  "region": "지역 (한국어, 예: 스페이사이드, 아일라, 하이랜드, 켄터키)" 또는 null,
  "abv": 도수 숫자 (예: 43) 또는 null,
  "age_years": 숙성 연수 정수 (NAS면 null),
  "cask_type": "캐스크 (한국어, 예: 셰리, 버번, 셰리+버번)" 또는 null,
  "confidence": "high" | "medium" | "low",
  "note": "제품 한 줄 설명 (한국어)"
}
규칙: 확실히 모르는 필드는 null. 흔한 제품이 아니거나 기억이 불확실하면 confidence를 낮춘다. 도수는 해당 제품의 표준 병입 기준. JSON 외의 텍스트는 절대 출력하지 않는다.`;

function parseNumber(v: unknown): number | null {
  const n = typeof v === 'string' ? Number(v) : v;
  return typeof n === 'number' && Number.isFinite(n) ? n : null;
}

function parseText(v: unknown): string | null {
  return typeof v === 'string' && v.trim() ? v.trim() : null;
}

/** x-ratelimit-(limit|remaining|reset)-<bucket> 헤더를 이름 하드코딩 없이 수집 */
function parseRateLimitHeaders(headers: Headers): RateLimitBucket[] {
  const buckets = new Map<string, { limit?: number; remaining?: number; reset?: number }>();
  headers.forEach((value, key) => {
    const match = key.toLowerCase().match(/^x-ratelimit-(limit|remaining|reset)-(.+)$/);
    if (!match) return;
    const n = Number(value);
    if (!Number.isFinite(n)) return;
    const bucket = buckets.get(match[2]) ?? {};
    bucket[match[1] as 'limit' | 'remaining' | 'reset'] = n;
    buckets.set(match[2], bucket);
  });
  return [...buckets.entries()].map(([name, b]) => ({
    name,
    limit: b.limit ?? null,
    remaining: b.remaining ?? null,
    reset: b.reset ?? null,
  }));
}

export async function lookupWhiskyInfo(name: string): Promise<WhiskyLookupResult> {
  const trimmed = name.trim();
  if (!trimmed) return { error: '위스키 이름을 입력해주세요.' };

  const apiKey = process.env.CEREBRAS_API_KEY;
  if (!apiKey) {
    return {
      error:
        'CEREBRAS_API_KEY가 설정되지 않았습니다. .env.local과 Vercel 환경변수에 추가해주세요.',
    };
  }

  try {
    const res = await fetch(CEREBRAS_API_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: MODEL,
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: trimmed },
        ],
        temperature: 0.2,
        // gpt-oss는 reasoning 모델 — 이 작업엔 낮은 노력으로 충분하고 토큰을 아낀다
        reasoning_effort: 'low',
        max_completion_tokens: 800,
      }),
    });

    const rateLimits = parseRateLimitHeaders(res.headers);

    if (res.status === 429) {
      const minuteReset = rateLimits.find(
        (b) => b.name.includes('minute') && b.reset != null
      )?.reset;
      return {
        error: `요청 한도를 초과했습니다.${
          minuteReset != null ? ` 약 ${Math.ceil(minuteReset)}초 후 다시 시도해주세요.` : ' 잠시 후 다시 시도해주세요.'
        }`,
        rateLimits,
      };
    }
    if (!res.ok) {
      return { error: `조회에 실패했습니다 (${res.status}). 잠시 후 다시 시도해주세요.`, rateLimits };
    }

    const data = await res.json();
    const content: string = data?.choices?.[0]?.message?.content ?? '';
    const usageRaw = data?.usage;
    const usage =
      usageRaw && typeof usageRaw.total_tokens === 'number'
        ? {
            prompt: usageRaw.prompt_tokens ?? 0,
            completion: usageRaw.completion_tokens ?? 0,
            total: usageRaw.total_tokens,
          }
        : undefined;

    const start = content.indexOf('{');
    const end = content.lastIndexOf('}');
    if (start < 0 || end <= start) {
      return { error: 'AI 응답을 해석하지 못했습니다.', usage, rateLimits };
    }

    const parsed = JSON.parse(content.slice(start, end + 1)) as Record<string, unknown>;
    const category = parseText(parsed.category);
    const abv = parseNumber(parsed.abv);
    const age = parseNumber(parsed.age_years);
    const confidence = parseText(parsed.confidence);

    return {
      fields: {
        name: parseText(parsed.name) ?? trimmed,
        distillery: parseText(parsed.distillery),
        category:
          category && CATEGORIES.includes(category as Category) ? (category as Category) : null,
        region: parseText(parsed.region),
        abv: abv != null && abv > 0 && abv < 100 ? abv : null,
        age_years: age != null && age > 0 && age < 100 ? Math.round(age) : null,
        cask_type: parseText(parsed.cask_type),
      },
      confidence:
        confidence === 'high' || confidence === 'medium' || confidence === 'low'
          ? confidence
          : 'low',
      note: parseText(parsed.note) ?? undefined,
      usage,
      rateLimits,
    };
  } catch {
    return { error: '조회 중 오류가 발생했습니다. 네트워크를 확인해주세요.' };
  }
}
