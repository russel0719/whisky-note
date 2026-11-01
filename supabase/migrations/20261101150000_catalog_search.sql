-- 카탈로그 검색: 띄어쓰기·단어 순서·오타에 강한 검색 함수
--   1) 검색어를 공백으로 나눈 모든 단어가 (이름 영문/한글/증류소, 공백 제거) 안에 있으면 일치
--      → "글렌피딕 12", "12 glenfiddich", "글렌피딕12" 모두 같은 결과
--   2) 단어가 다 맞지 않아도, 첫 단어(브랜드)가 맞거나 비슷하면서 절반 이상의 단어가 맞거나
--      trigram 유사도가 높으면 후보로 (영문 오타 대응). 브랜드 조건이 없으면 "쿨일라 DE"가
--      "라가불린 DE"처럼 뒷단어만 같은 다른 증류소로 잘못 이어진다
--   정렬: 단어 전부 일치 → 맞은 단어 수 → 유사도 → 이름
-- pg_trgm은 공용 DB의 extensions 스키마에 설치한다 (추가만 하는 변경). 이미 다른 스키마에
-- 설치돼 있어도 동작하도록 함수 search_path에 extensions와 public을 둔다.

CREATE EXTENSION IF NOT EXISTS pg_trgm WITH SCHEMA extensions;

CREATE FUNCTION whisky_note.search_catalog(p_query text, p_limit int DEFAULT 12)
RETURNS SETOF whisky_note.catalog
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = whisky_note, extensions, public, pg_temp
AS $$
  WITH q AS (
    SELECT lower(btrim(p_query)) AS raw,
           array_remove(regexp_split_to_array(lower(btrim(p_query)), '\s+'), '') AS tokens
  ),
  ranked AS (
    SELECT c.id,
           (SELECT count(*) FROM unnest(q.tokens) AS t WHERE strpos(c.flat, t) > 0) AS matched,
           cardinality(q.tokens) AS total,
           -- 첫 단어(대개 브랜드)가 맞거나 비슷해야 부분 일치·유사 후보로 인정한다
           (strpos(c.flat, q.tokens[1]) > 0 OR word_similarity(q.tokens[1], c.hay) >= 0.5)
             AS brand_ok,
           word_similarity(q.raw, c.hay) AS sim
    FROM (
      SELECT id, hay, replace(hay, ' ', '') AS flat
      FROM (SELECT id, lower(concat_ws(' ', name, name_ko, distillery)) AS hay FROM catalog) AS h
    ) AS c, q
    WHERE char_length(q.raw) >= 2
  )
  SELECT cat.*
  FROM ranked r
  JOIN catalog cat ON cat.id = r.id
  WHERE r.matched = r.total
     OR (r.brand_ok AND (r.sim >= 0.45 OR r.matched * 2 >= r.total))
  ORDER BY r.matched = r.total DESC, r.matched DESC, r.sim DESC, coalesce(cat.name_ko, cat.name)
  LIMIT least(greatest(p_limit, 1), 50);
$$;

REVOKE EXECUTE ON FUNCTION whisky_note.search_catalog(text, int) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION whisky_note.search_catalog(text, int) TO authenticated;
