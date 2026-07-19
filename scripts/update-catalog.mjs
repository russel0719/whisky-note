// 카탈로그 정기 갱신 — 최근 출시/유행 위스키를 LLM에 물어 catalog에 upsert한다.
// GitHub Actions cron(매월)에서 실행. 로컬 실행: node --env-file=.env.local scripts/update-catalog.mjs
// 필요 env: CEREBRAS_API_KEY, SUPABASE_URL(또는 NEXT_PUBLIC_SUPABASE_URL), SUPABASE_SERVICE_ROLE_KEY

import { createClient } from '@supabase/supabase-js';

const API_URL = 'https://api.cerebras.ai/v1/chat/completions';
const MODEL = 'gpt-oss-120b';

const apiKey = process.env.CEREBRAS_API_KEY;
const supabaseUrl = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!apiKey || !supabaseUrl || !serviceKey) {
  console.error('CEREBRAS_API_KEY / SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY 가 필요합니다.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceKey, { db: { schema: 'whisky_note' } });

const YEAR = new Date().getFullYear();

/** 카테고리별로 "최근 출시·새로 유행" 제품을 묻는다 */
const BATCHES = [
  { category: 'single_malt', country: '스코틀랜드', topic: `스카치 싱글몰트 중 ${YEAR - 1}~${YEAR}년에 출시되었거나 최근 널리 유통되기 시작한 신제품·리뉴얼 제품` },
  { category: 'blended', country: '스코틀랜드', topic: `블렌디드 스카치 중 ${YEAR - 1}~${YEAR}년 신제품·한정판` },
  { category: 'bourbon', country: '미국', topic: `버번 위스키 중 ${YEAR - 1}~${YEAR}년에 출시되었거나 최근 인기가 높아진 제품` },
  { category: 'rye', country: '미국', topic: `라이 위스키 중 최근 출시·인기 제품` },
  { category: 'irish', country: '아일랜드', topic: `아이리시 위스키 중 ${YEAR - 1}~${YEAR}년 신제품·인기 제품` },
  { category: 'japanese', country: '일본', topic: `재패니즈 위스키 중 ${YEAR - 1}~${YEAR}년 신제품·인기 제품` },
  { category: 'other', country: null, topic: `대만·인도·호주·유럽 등 월드 위스키 중 최근 출시되었거나 새로 주목받는 제품` },
];

const SYSTEM = `너는 위스키 카탈로그 데이터 전문가다. 요청된 조건에 맞는 "실존이 확실한" 위스키 제품을 JSON 배열 하나로만 출력한다.
각 항목: {"name": "정식 제품명(영문, 브랜드 포함)", "distillery": "증류소/브랜드", "region": "지역(한국어)" 또는 null, "abv": 도수 숫자 또는 null, "age_years": 숙성 연수 정수(NAS면 null), "cask_type": "캐스크(한국어)" 또는 null}
규칙: 최대 25개. 존재가 불확실한 제품은 제외. JSON 배열 외 텍스트 금지.`;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const clean = (v) => (typeof v === 'string' && v.trim() ? v.trim() : null);
const cleanNum = (v, min, max) => {
  const n = typeof v === 'string' ? Number(v) : v;
  return typeof n === 'number' && Number.isFinite(n) && n > min && n < max ? n : null;
};

async function askBatch(batch, attempt = 1) {
  const res = await fetch(API_URL, {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: MODEL,
      messages: [
        { role: 'system', content: SYSTEM },
        { role: 'user', content: batch.topic },
      ],
      temperature: 0.1,
      reasoning_effort: 'low',
      max_completion_tokens: 3000,
    }),
  });
  if (res.status === 429 && attempt <= 3) {
    await sleep(40_000);
    return askBatch(batch, attempt + 1);
  }
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = await res.json();
  const content = data?.choices?.[0]?.message?.content ?? '';
  const start = content.indexOf('[');
  const end = content.lastIndexOf(']');
  if (start < 0 || end <= start) throw new Error('JSON 배열 없음');
  return JSON.parse(content.slice(start, end + 1));
}

const { count: before } = await supabase
  .from('catalog')
  .select('*', { count: 'exact', head: true });

let collected = 0;
for (let i = 0; i < BATCHES.length; i++) {
  const batch = BATCHES[i];
  process.stdout.write(`[${i + 1}/${BATCHES.length}] ${batch.category} … `);
  try {
    const items = await askBatch(batch);
    const rows = items
      .map((item) => ({
        name: clean(item?.name),
        distillery: clean(item?.distillery),
        category: batch.category,
        region: clean(item?.region),
        country: batch.country,
        abv: cleanNum(item?.abv, 0, 100),
        age_years: cleanNum(item?.age_years, 0, 100),
        cask_type: clean(item?.cask_type),
      }))
      .filter((r) => r.name);
    if (rows.length > 0) {
      const { error } = await supabase
        .from('catalog')
        .upsert(rows, { onConflict: 'name', ignoreDuplicates: true });
      if (error) throw new Error(error.message);
    }
    collected += rows.length;
    console.log(`${rows.length}개 수집`);
  } catch (e) {
    console.log(`실패: ${e.message} — 건너뜀`);
  }
  if (i < BATCHES.length - 1) await sleep(13_000);
}

const { count: after } = await supabase
  .from('catalog')
  .select('*', { count: 'exact', head: true });

console.log(`\n완료: 수집 ${collected}개 중 신규 ${(after ?? 0) - (before ?? 0)}개 추가 (카탈로그 총 ${after ?? '?'}종)`);
