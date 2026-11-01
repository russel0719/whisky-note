-- 데이터 정합성 (로드맵 고도화 1단계)
--   1) whiskies.catalog_id — 카탈로그 항목과 내 위스키를 FK로 연결해 이름 비교 없이 중복을 막는다.
--   2) ensure_whisky_from_catalog() — 카탈로그 항목 → 내 위스키 (있으면 재사용, 없으면 생성)
--   3) save_tasting() — 시음 노트 + 아로마 태그를 한 트랜잭션으로 저장
-- 두 함수 모두 SECURITY INVOKER라 호출자의 RLS가 그대로 적용된다.

-- ---------------------------------------------------------------------------
-- 1) catalog_id
-- ---------------------------------------------------------------------------
ALTER TABLE whisky_note.whiskies
  ADD COLUMN catalog_id uuid REFERENCES whisky_note.catalog ON DELETE SET NULL;

-- 기존 데이터 백필: 이름이 카탈로그 영문/한글 표기와 정확히(대소문자 무시) 하나만 일치하는 위스키를,
-- 사용자·카탈로그 항목당 가장 먼저 등록된 1건에만 연결한다 (이미 생긴 중복은 그대로 둔다).
WITH matches AS (
  SELECT w.id AS whisky_id, w.user_id, w.created_at, c.id AS catalog_id,
         count(*) OVER (PARTITION BY w.id) AS match_count
  FROM whisky_note.whiskies w
  JOIN whisky_note.catalog c
    ON lower(w.name) = lower(c.name) OR lower(w.name) = lower(c.name_ko)
),
unique_matches AS (
  SELECT whisky_id, catalog_id,
         row_number() OVER (PARTITION BY user_id, catalog_id ORDER BY created_at) AS rn
  FROM matches
  WHERE match_count = 1
)
UPDATE whisky_note.whiskies w
SET catalog_id = m.catalog_id
FROM unique_matches m
WHERE w.id = m.whisky_id AND m.rn = 1;

-- NULL은 서로 다른 값으로 취급되므로 직접 입력 위스키(catalog_id NULL)는 제약을 받지 않는다.
CREATE UNIQUE INDEX whiskies_user_catalog_key ON whisky_note.whiskies (user_id, catalog_id);

-- ---------------------------------------------------------------------------
-- 2) 카탈로그 항목 → 내 위스키 id
-- ---------------------------------------------------------------------------
CREATE FUNCTION whisky_note.ensure_whisky_from_catalog(p_catalog_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_id uuid;
  c whisky_note.catalog;
BEGIN
  SELECT id INTO v_id FROM whisky_note.whiskies
  WHERE user_id = v_uid AND catalog_id = p_catalog_id;
  IF v_id IS NOT NULL THEN
    RETURN v_id;
  END IF;

  SELECT * INTO c FROM whisky_note.catalog WHERE id = p_catalog_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION '카탈로그 항목을 찾지 못했습니다.' USING ERRCODE = 'P0002';
  END IF;

  -- 카탈로그 연결 이전에 같은 이름으로 등록해 둔 위스키가 있으면 연결만 한다
  UPDATE whisky_note.whiskies SET catalog_id = c.id
  WHERE id = (
    SELECT id FROM whisky_note.whiskies
    WHERE user_id = v_uid AND catalog_id IS NULL
      AND (lower(name) = lower(c.name) OR lower(name) = lower(c.name_ko))
    ORDER BY created_at
    LIMIT 1
  )
  RETURNING id INTO v_id;
  IF v_id IS NOT NULL THEN
    RETURN v_id;
  END IF;

  -- 동시 요청으로 먼저 생성된 경우 유니크 인덱스에 막히므로 다시 조회한다
  INSERT INTO whisky_note.whiskies
    (name, catalog_id, distillery, category, region, abv, age_years, cask_type)
  VALUES
    (coalesce(c.name_ko, c.name), c.id, c.distillery, c.category, c.region, c.abv,
     c.age_years, c.cask_type)
  ON CONFLICT (user_id, catalog_id) DO NOTHING
  RETURNING id INTO v_id;
  IF v_id IS NULL THEN
    SELECT id INTO v_id FROM whisky_note.whiskies
    WHERE user_id = v_uid AND catalog_id = p_catalog_id;
  END IF;
  RETURN v_id;
END;
$$;

-- ---------------------------------------------------------------------------
-- 3) 시음 노트 저장 (p_id NULL이면 생성, 아니면 수정). 아로마 태그는 전체 교체.
--    p_tasting은 tastings 컬럼명을 키로 하는 JSON — 키가 없으면 NULL로 저장된다.
-- ---------------------------------------------------------------------------
CREATE FUNCTION whisky_note.save_tasting(
  p_tasting jsonb,
  p_tag_ids smallint[] DEFAULT '{}',
  p_id uuid DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
DECLARE
  r whisky_note.tastings := jsonb_populate_record(NULL::whisky_note.tastings, p_tasting);
  v_id uuid;
BEGIN
  IF p_id IS NULL THEN
    INSERT INTO whisky_note.tastings (
      whisky_id, bottle_id, tasted_at, location,
      nose_score, palate_score, finish_score, overall_score,
      nose_note, palate_note, finish_note, comment, pairing,
      would_buy_again, price_paid, color, photo_url
    ) VALUES (
      r.whisky_id, r.bottle_id, r.tasted_at, r.location,
      r.nose_score, r.palate_score, r.finish_score, r.overall_score,
      r.nose_note, r.palate_note, r.finish_note, r.comment, r.pairing,
      r.would_buy_again, r.price_paid, r.color, r.photo_url
    )
    RETURNING id INTO v_id;
  ELSE
    UPDATE whisky_note.tastings SET
      whisky_id = r.whisky_id, bottle_id = r.bottle_id, tasted_at = r.tasted_at,
      location = r.location,
      nose_score = r.nose_score, palate_score = r.palate_score,
      finish_score = r.finish_score, overall_score = r.overall_score,
      nose_note = r.nose_note, palate_note = r.palate_note, finish_note = r.finish_note,
      comment = r.comment, pairing = r.pairing,
      would_buy_again = r.would_buy_again, price_paid = r.price_paid,
      color = r.color, photo_url = r.photo_url
    WHERE id = p_id
    RETURNING id INTO v_id;
    IF v_id IS NULL THEN
      RAISE EXCEPTION '시음 노트를 찾지 못했습니다.' USING ERRCODE = 'P0002';
    END IF;
    DELETE FROM whisky_note.tasting_aromas WHERE tasting_id = v_id;
  END IF;

  INSERT INTO whisky_note.tasting_aromas (tasting_id, tag_id)
  SELECT DISTINCT v_id, tag_id FROM unnest(p_tag_ids) AS tag_id;

  RETURN v_id;
END;
$$;

REVOKE EXECUTE ON FUNCTION whisky_note.ensure_whisky_from_catalog(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION whisky_note.save_tasting(jsonb, smallint[], uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION whisky_note.ensure_whisky_from_catalog(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION whisky_note.save_tasting(jsonb, smallint[], uuid) TO authenticated;
