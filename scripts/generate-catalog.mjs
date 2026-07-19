// 글로벌 위스키 카탈로그 시드 생성기
// 실행: node --env-file=.env.local scripts/generate-catalog.mjs
// 출력: supabase/migrations/<timestamp>_catalog_seed.sql
// Cerebras free tier(5 req/분)에 맞춰 배치 간 13초 대기한다.

import { writeFile } from 'node:fs/promises';

const API_URL = 'https://api.cerebras.ai/v1/chat/completions';
const MODEL = 'gpt-oss-120b';
const OUT = 'supabase/migrations/20260719110000_catalog_seed.sql';

const apiKey = process.env.CEREBRAS_API_KEY;
if (!apiKey) {
  console.error('CEREBRAS_API_KEY가 없습니다. .env.local을 확인하세요.');
  process.exit(1);
}

/** category는 배치에서 강제하고, LLM에는 제품 정보만 맡긴다 */
const BATCHES = [
  // ── 스카치 싱글몰트: 스페이사이드
  { category: 'single_malt', region: '스페이사이드', country: '스코틀랜드', brands: ['Glenfiddich', 'The Balvenie', 'Kininvie'] },
  { category: 'single_malt', region: '스페이사이드', country: '스코틀랜드', brands: ['The Macallan', 'Aberlour', 'Cardhu'] },
  { category: 'single_malt', region: '스페이사이드', country: '스코틀랜드', brands: ['The Glenlivet', 'Glen Grant', 'Longmorn'] },
  { category: 'single_malt', region: '스페이사이드', country: '스코틀랜드', brands: ['Glenfarclas', 'Craigellachie', 'Aultmore'] },
  { category: 'single_malt', region: '스페이사이드', country: '스코틀랜드', brands: ['Mortlach', 'The Singleton of Dufftown', 'Glendullan'] },
  { category: 'single_malt', region: '스페이사이드', country: '스코틀랜드', brands: ['BenRiach', 'Glen Moray', 'Speyburn'] },
  { category: 'single_malt', region: '스페이사이드', country: '스코틀랜드', brands: ['Benromach', 'The Glenrothes', 'Glen Elgin'] },
  { category: 'single_malt', region: '스페이사이드', country: '스코틀랜드', brands: ['Strathisla', 'Tamdhu', 'Knockando'] },
  { category: 'single_malt', region: '스페이사이드', country: '스코틀랜드', brands: ['Linkwood', 'Tormore', 'Glentauchers', 'Tamnavulin'] },
  { category: 'single_malt', region: '스페이사이드', country: '스코틀랜드', brands: ['Cragganmore', 'Dailuaine', 'Inchgower', 'Ballindalloch'] },
  // ── 하이랜드
  { category: 'single_malt', region: '하이랜드', country: '스코틀랜드', brands: ['Glenmorangie', 'The Dalmore', 'The GlenDronach'] },
  { category: 'single_malt', region: '하이랜드', country: '스코틀랜드', brands: ['Oban', 'Clynelish', 'Old Pulteney'] },
  { category: 'single_malt', region: '하이랜드', country: '스코틀랜드', brands: ['Dalwhinnie', 'Tomatin', 'The Singleton of Glen Ord'] },
  { category: 'single_malt', region: '하이랜드', country: '스코틀랜드', brands: ['Aberfeldy', 'Edradour', 'Blair Athol'] },
  { category: 'single_malt', region: '하이랜드', country: '스코틀랜드', brands: ['Glengoyne', 'Deanston', 'Tullibardine'] },
  { category: 'single_malt', region: '하이랜드', country: '스코틀랜드', brands: ['Royal Lochnagar', 'Fettercairn', 'Glencadam'] },
  { category: 'single_malt', region: '하이랜드', country: '스코틀랜드', brands: ['anCnoc', 'Balblair', 'Glen Garioch'] },
  { category: 'single_malt', region: '하이랜드', country: '스코틀랜드', brands: ['Ardmore', 'Loch Lomond', 'Wolfburn', 'Glenglassaugh'] },
  // ── 아일라
  { category: 'single_malt', region: '아일라', country: '스코틀랜드', brands: ['Ardbeg', 'Lagavulin', 'Laphroaig'] },
  { category: 'single_malt', region: '아일라', country: '스코틀랜드', brands: ['Bowmore', 'Bruichladdich', 'Port Charlotte', 'Octomore'] },
  { category: 'single_malt', region: '아일라', country: '스코틀랜드', brands: ['Caol Ila', 'Bunnahabhain', 'Kilchoman', 'Ardnahoe'] },
  // ── 아일랜즈
  { category: 'single_malt', region: '아일랜즈', country: '스코틀랜드', brands: ['Talisker', 'Highland Park', 'Scapa'] },
  { category: 'single_malt', region: '아일랜즈', country: '스코틀랜드', brands: ['Jura', 'Arran', 'Tobermory', 'Ledaig'] },
  { category: 'single_malt', region: '아일랜즈', country: '스코틀랜드', brands: ['Torabhaig', 'Isle of Raasay', 'Lochranza'] },
  // ── 캠벨타운 / 로우랜드
  { category: 'single_malt', region: '캠벨타운', country: '스코틀랜드', brands: ['Springbank', 'Longrow', 'Hazelburn', 'Glen Scotia', 'Kilkerran'] },
  { category: 'single_malt', region: '로우랜드', country: '스코틀랜드', brands: ['Auchentoshan', 'Glenkinchie', 'Bladnoch', 'Kingsbarns', 'Rosebank'] },
  // ── 블렌디드 / 블렌디드 몰트 / 그레인
  { category: 'blended', region: null, country: '스코틀랜드', brands: ['Johnnie Walker', 'Chivas Regal', "Ballantine's"] },
  { category: 'blended', region: null, country: '스코틀랜드', brands: ["Dewar's", 'The Famous Grouse', "Grant's", 'Cutty Sark'] },
  { category: 'blended', region: null, country: '스코틀랜드', brands: ['Royal Salute', 'Old Parr', 'J&B', 'Whyte & Mackay'] },
  { category: 'blended_malt', region: null, country: '스코틀랜드', brands: ['Monkey Shoulder', 'Copper Dog', 'Johnnie Walker Green Label', 'Big Peat', 'Scallywag', 'Timorous Beastie'] },
  { category: 'grain', region: null, country: '스코틀랜드', brands: ['Haig Club', 'Girvan', 'Cameronbridge', 'North British'] },
  // ── 버번
  { category: 'bourbon', region: '켄터키', country: '미국', brands: ['Buffalo Trace', 'Eagle Rare', "Blanton's", 'W.L. Weller', 'E.H. Taylor'] },
  { category: 'bourbon', region: '켄터키', country: '미국', brands: ["Maker's Mark", 'Wild Turkey', "Russell's Reserve", 'Four Roses'] },
  { category: 'bourbon', region: '켄터키', country: '미국', brands: ['Jim Beam', 'Knob Creek', "Booker's", "Basil Hayden's", 'Old Grand-Dad'] },
  { category: 'bourbon', region: '켄터키', country: '미국', brands: ['Woodford Reserve', 'Old Forester', 'Elijah Craig', 'Evan Williams'] },
  { category: 'bourbon', region: null, country: '미국', brands: ["Michter's", '1792', 'Heaven Hill', 'Very Old Barton', 'Larceny'] },
  // ── 라이 / 테네시
  { category: 'rye', region: null, country: '미국', brands: ['Rittenhouse', 'Sazerac Rye', 'WhistlePig', "Michter's Rye"] },
  { category: 'rye', region: null, country: '미국', brands: ['Bulleit Rye', 'Knob Creek Rye', 'High West', 'Old Overholt'] },
  { category: 'other', region: '테네시', country: '미국', brands: ["Jack Daniel's", 'George Dickel', 'Uncle Nearest'] },
  // ── 아이리시
  { category: 'irish', region: null, country: '아일랜드', brands: ['Jameson', 'Bushmills', 'Tullamore D.E.W.'] },
  { category: 'irish', region: null, country: '아일랜드', brands: ['Redbreast', 'Green Spot', 'Yellow Spot', 'Powers', 'Midleton'] },
  { category: 'irish', region: null, country: '아일랜드', brands: ['Teeling', 'Connemara', 'Waterford', 'West Cork'] },
  // ── 재패니즈
  { category: 'japanese', region: null, country: '일본', brands: ['Yamazaki', 'Hakushu', 'Hibiki', 'Suntory Toki', 'The Chita'] },
  { category: 'japanese', region: null, country: '일본', brands: ['Nikka Yoichi', 'Nikka Miyagikyo', 'Nikka From the Barrel', 'Nikka Coffey Grain', 'Nikka Taketsuru'] },
  { category: 'japanese', region: null, country: '일본', brands: ["Ichiro's Malt Chichibu", 'Mars Shinshu', 'Akkeshi', 'Kanosuke'] },
  // ── 월드
  { category: 'other', region: null, country: '대만', brands: ['Kavalan', 'Omar'] },
  { category: 'other', region: null, country: '인도', brands: ['Amrut', 'Paul John', 'Rampur', 'Indri'] },
  { category: 'other', region: null, country: null, brands: ['Starward', 'Sullivans Cove', 'Penderyn', 'Cotswolds', 'Milk & Honey', 'Mackmyra'] },
  { category: 'other', region: null, country: '캐나다', brands: ['Crown Royal', 'Canadian Club', 'Lot No. 40'] },
];

const SYSTEM = `너는 위스키 카탈로그 데이터 전문가다. 주어진 증류소/브랜드들의 "실제로 시판 중이거나 널리 유통된" 대표 제품(코어 라인업 + 유명 한정판)을 JSON 배열 하나로만 출력한다.
각 항목: {"name": "정식 제품명(영문, 브랜드 포함)", "distillery": "증류소/브랜드", "abv": 도수 숫자 또는 null, "age_years": 숙성 연수 정수(NAS면 null), "cask_type": "캐스크(한국어, 예: 셰리, 버번, 미즈나라)" 또는 null}
규칙: 브랜드당 3~10개. 존재가 확실한 제품만 포함하고, 불확실하면 빼라. 같은 제품의 중복 표기 금지. JSON 배열 외의 텍스트 출력 금지.`;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function askBatch(batch, attempt = 1) {
  const res = await fetch(API_URL, {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: MODEL,
      messages: [
        { role: 'system', content: SYSTEM },
        { role: 'user', content: `브랜드: ${batch.brands.join(', ')}` },
      ],
      temperature: 0.1,
      reasoning_effort: 'low',
      max_completion_tokens: 3500,
    }),
  });
  if (res.status === 429 && attempt <= 3) {
    console.log(`  429 — 40초 대기 후 재시도 (${attempt}/3)`);
    await sleep(40_000);
    return askBatch(batch, attempt + 1);
  }
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${(await res.text()).slice(0, 200)}`);
  const data = await res.json();
  const content = data?.choices?.[0]?.message?.content ?? '';
  const start = content.indexOf('[');
  const end = content.lastIndexOf(']');
  if (start < 0 || end <= start) throw new Error('JSON 배열을 찾지 못함');
  return JSON.parse(content.slice(start, end + 1));
}

function clean(v) {
  return typeof v === 'string' && v.trim() ? v.trim() : null;
}
function cleanNum(v, min, max) {
  const n = typeof v === 'string' ? Number(v) : v;
  return typeof n === 'number' && Number.isFinite(n) && n > min && n < max ? n : null;
}
const q = (s) => (s == null ? 'NULL' : `'${String(s).replace(/'/g, "''")}'`);

const rows = new Map(); // name(lower) → row
let batchIndex = 0;
for (const batch of BATCHES) {
  batchIndex += 1;
  process.stdout.write(`[${batchIndex}/${BATCHES.length}] ${batch.brands.join(', ')} … `);
  try {
    const items = await askBatch(batch);
    let added = 0;
    for (const item of items) {
      const name = clean(item?.name);
      if (!name || rows.has(name.toLowerCase())) continue;
      rows.set(name.toLowerCase(), {
        name,
        distillery: clean(item?.distillery),
        category: batch.category,
        region: batch.region,
        country: batch.country,
        abv: cleanNum(item?.abv, 0, 100),
        age_years: cleanNum(item?.age_years, 0, 100),
        cask_type: clean(item?.cask_type),
      });
      added += 1;
    }
    console.log(`${added}개 (누적 ${rows.size})`);
  } catch (e) {
    console.log(`실패: ${e.message} — 건너뜀`);
  }
  if (batchIndex < BATCHES.length) await sleep(13_000);
}

const all = [...rows.values()];
if (all.length < 100) {
  console.error(`수집 ${all.length}개 — 너무 적어 시드 파일을 만들지 않습니다.`);
  process.exit(1);
}

const CHUNK = 100;
let sql = `-- 글로벌 위스키 카탈로그 시드 (scripts/generate-catalog.mjs 생성, ${all.length}종)\n-- AI 생성 데이터이므로 개별 수치(도수 등)에 오류가 있을 수 있다. 발견 시 이 파일이 아니라\n-- 새 마이그레이션으로 수정할 것.\n\n`;
for (let i = 0; i < all.length; i += CHUNK) {
  const chunk = all.slice(i, i + CHUNK);
  sql += 'INSERT INTO whisky_note.catalog (name, distillery, category, region, country, abv, age_years, cask_type) VALUES\n';
  sql += chunk
    .map(
      (r) =>
        `(${q(r.name)}, ${q(r.distillery)}, ${q(r.category)}, ${q(r.region)}, ${q(r.country)}, ${r.abv ?? 'NULL'}, ${r.age_years ?? 'NULL'}, ${q(r.cask_type)})`
    )
    .join(',\n');
  sql += '\nON CONFLICT (name) DO NOTHING;\n\n';
}

await writeFile(OUT, sql);
console.log(`\n완료: ${OUT} (${all.length}종)`);
