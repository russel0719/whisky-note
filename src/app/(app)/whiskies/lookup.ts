'use server';

import { CATEGORIES, type Category } from '@/lib/types';

// travel-plan과 동일한 NVIDIA API 패턴 (공용 NVIDIA_API_KEY 재사용)
const NVIDIA_API_URL = 'https://integrate.api.nvidia.com/v1/chat/completions';
const MODEL = 'meta/llama-3.3-70b-instruct';

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

export async function lookupWhiskyInfo(name: string): Promise<WhiskyLookupResult> {
  const trimmed = name.trim();
  if (!trimmed) return { error: '위스키 이름을 입력해주세요.' };

  const apiKey = process.env.NVIDIA_API_KEY;
  if (!apiKey) {
    return {
      error:
        'NVIDIA_API_KEY가 설정되지 않았습니다. .env.local과 Vercel 환경변수에 추가해주세요.',
    };
  }

  try {
    const res = await fetch(NVIDIA_API_URL, {
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
        max_tokens: 400,
      }),
    });
    if (!res.ok) {
      return { error: `조회에 실패했습니다 (${res.status}). 잠시 후 다시 시도해주세요.` };
    }

    const data = await res.json();
    const content: string = data?.choices?.[0]?.message?.content ?? '';
    const start = content.indexOf('{');
    const end = content.lastIndexOf('}');
    if (start < 0 || end <= start) return { error: 'AI 응답을 해석하지 못했습니다.' };

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
    };
  } catch {
    return { error: '조회 중 오류가 발생했습니다. 네트워크를 확인해주세요.' };
  }
}
