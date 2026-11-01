-- 선택형 시음 노트: Nose/Palate/Finish를 서술 대신 선택지로 기록한다.
--   - 마신 방식(serve: 니트/가수/온더록/하이볼) — 같은 위스키 점수 비교의 기준
--   - 단계별 선택 컬럼 (키 목록은 src/lib/types.ts의 NOSE_INTENSITIES 등과 동기)
--   - 아로마 태그에 단계(stage) 추가. 기존 태그는 단계 구분 없이 기록됐으므로 'overall'
--   - save_tasting()이 단계별 태그를 받도록 시그니처 변경
-- 기존 nose_note/palate_note/finish_note는 남겨 두고, 값이 있는 노트에서만 표시·편집한다.

ALTER TABLE whisky_note.tastings
  ADD COLUMN serve text CHECK (serve IN ('neat', 'water', 'rocks', 'highball')),
  ADD COLUMN nose_intensity text CHECK (nose_intensity IN ('light', 'medium', 'strong')),
  ADD COLUMN palate_body text CHECK (palate_body IN ('light', 'medium', 'full')),
  ADD COLUMN palate_sweetness text CHECK (palate_sweetness IN ('dry', 'balanced', 'sweet')),
  ADD COLUMN palate_texture text[] NOT NULL DEFAULT '{}' CHECK (
    palate_texture <@ ARRAY['oily', 'creamy', 'silky', 'waxy', 'watery', 'hot']
  ),
  ADD COLUMN finish_length text CHECK (finish_length IN ('short', 'medium', 'long')),
  ADD COLUMN finish_character text[] NOT NULL DEFAULT '{}' CHECK (
    finish_character <@ ARRAY['dry', 'warm', 'clean', 'sweet', 'bitter', 'tannic', 'tingling']
  );

ALTER TABLE whisky_note.tasting_aromas
  ADD COLUMN stage text NOT NULL DEFAULT 'overall'
    CHECK (stage IN ('overall', 'nose', 'palate', 'finish'));
ALTER TABLE whisky_note.tasting_aromas ALTER COLUMN stage DROP DEFAULT;
ALTER TABLE whisky_note.tasting_aromas
  DROP CONSTRAINT tasting_aromas_pkey,
  ADD PRIMARY KEY (tasting_id, stage, tag_id);

-- ---------------------------------------------------------------------------
-- save_tasting: p_aromas = [{"stage": "nose", "tag_id": 3}, ...]
-- ---------------------------------------------------------------------------
DROP FUNCTION whisky_note.save_tasting(jsonb, smallint[], uuid);

CREATE FUNCTION whisky_note.save_tasting(
  p_tasting jsonb,
  p_aromas jsonb DEFAULT '[]',
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
      nose_score, palate_score, finish_score, overall_score, serve,
      nose_intensity, palate_body, palate_sweetness, palate_texture,
      finish_length, finish_character,
      nose_note, palate_note, finish_note, comment, pairing,
      would_buy_again, price_paid, color, photo_url
    ) VALUES (
      r.whisky_id, r.bottle_id, r.tasted_at, r.location,
      r.nose_score, r.palate_score, r.finish_score, r.overall_score, r.serve,
      r.nose_intensity, r.palate_body, r.palate_sweetness, coalesce(r.palate_texture, '{}'),
      r.finish_length, coalesce(r.finish_character, '{}'),
      r.nose_note, r.palate_note, r.finish_note, r.comment, r.pairing,
      r.would_buy_again, r.price_paid, r.color, r.photo_url
    )
    RETURNING id INTO v_id;
  ELSE
    UPDATE whisky_note.tastings SET
      whisky_id = r.whisky_id, bottle_id = r.bottle_id, tasted_at = r.tasted_at,
      location = r.location,
      nose_score = r.nose_score, palate_score = r.palate_score,
      finish_score = r.finish_score, overall_score = r.overall_score, serve = r.serve,
      nose_intensity = r.nose_intensity, palate_body = r.palate_body,
      palate_sweetness = r.palate_sweetness,
      palate_texture = coalesce(r.palate_texture, '{}'),
      finish_length = r.finish_length,
      finish_character = coalesce(r.finish_character, '{}'),
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

  INSERT INTO whisky_note.tasting_aromas (tasting_id, stage, tag_id)
  SELECT DISTINCT v_id, a.stage, a.tag_id
  FROM jsonb_to_recordset(p_aromas) AS a(stage text, tag_id smallint);

  RETURN v_id;
END;
$$;

REVOKE EXECUTE ON FUNCTION whisky_note.save_tasting(jsonb, jsonb, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION whisky_note.save_tasting(jsonb, jsonb, uuid) TO authenticated;
