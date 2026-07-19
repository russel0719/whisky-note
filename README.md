# Whisky Note

위스키 시음/구매 경험을 기록하는 개인용 웹앱 PWA.
시음 노트(100점제 Nose/Palate/Finish 평가, 아로마 태그, 페어링, 재구매 의사)와
구매 보틀(가격, 개봉일, 잔량, 개봉 후 경과) 관리를 지원한다.

## 스택

- Next.js 15 (App Router) + TypeScript + Tailwind CSS 4
- Supabase (`@supabase/ssr`) — 공용 Supabase 프로젝트, 스키마: `whisky_note`
- Supabase Auth (이메일+비밀번호)
- PWA: `@serwist/next` (프로덕션 빌드에서 서비스워커 생성)
- 배포: Vercel

## 로컬 개발

```bash
npm install
cp .env.example .env.local  # NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY 채우기
npm run dev
```

선택 환경변수:

- `ALLOWED_EMAILS` — 쉼표로 구분한 허용 이메일 목록. 설정하면 목록 밖 이메일은
  가입·로그인이 거부되고 기존 세션도 미들웨어에서 차단된다 (1인용 비공개 운영).
  미설정 시 제한 없음.

## 위스키 카탈로그

위스키 마스터 데이터는 앱에서 직접 입력하지 않고 `whisky_note.catalog`(공용 읽기 전용)에서
검색해 선택한다. 카탈로그는 두 스크립트로 관리한다 (Cerebras `gpt-oss-120b`, free tier
5 req/분에 맞춰 배치 간 13초 대기):

- `scripts/generate-catalog.mjs` — 초기 시드(주요 증류소 150곳 코어 라인업)를
  마이그레이션 SQL로 생성. `node --env-file=.env.local scripts/generate-catalog.mjs`
- `scripts/update-catalog.mjs` — 최근 출시/유행 제품을 카탈로그에 직접 upsert.
  **GitHub Actions가 매월 1일 자동 실행** (`.github/workflows/catalog-update.yml`,
  수동 실행: Actions 탭 → Catalog Update → Run workflow)
  - 필요 GitHub Secrets: `CEREBRAS_API_KEY`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`

## Supabase 스키마 적용

마이그레이션 소스는 `supabase/migrations/`에 있다.

```bash
supabase link --project-ref <공용 프로젝트 ref>
supabase db push
```

적용 후 Supabase 대시보드 > Settings > API > **Exposed schemas**에 `whisky_note`를 추가해야
클라이언트에서 접근할 수 있다.

## 주요 화면

- `/` 대시보드 — 최근 시음 히어로(점수 다이얼), 오픈 중인 보틀(잔량/개봉 경과, 6개월 리마인드)
- `/whiskies` 위스키 목록/검색 · `/whiskies/[id]` 상세(보틀·시음 이력, 점수 추이, 개봉 경과 차트) · 편집
- `/bottles` 보틀 관리 — 개봉 처리, 잔량 슬라이더(보틀 실루엣 게이지), 공병 처리, 편집
- `/tastings` 시음 노트 목록(검색·필터·정렬) · 작성/편집(컬러 스와치, 사진, 아로마 태그) · 상세
- `/stats` 통계 — 아로마 레이더 취향 프로필, 분류별 평균, 월별 지출/시음, 캐비닛 잔여 가치
- `/new` 기록 추가 분기 (구매 vs 시음)

## 디자인 가이드라인

`~/.claude/design.md`의 구조를 따르되, 컬러는 다크+앰버 위스키 무드로 편차를 둔다.
편차 상세는 `~/.claude/docs/projects/whisky-note.md`의 "디자인 가이드라인" 항목 참고.

## 프로젝트 문서

- 전역 규칙: `~/.claude/CLAUDE.md`
- 이 프로젝트 상세 문서: `~/.claude/docs/projects/whisky-note.md`
