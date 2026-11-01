-- 플라이트(비교 시음) + 블라인드 시음
--   flights — 한 자리에서 여러 잔을 나란히 마신 세션. blind이면 잔을 위스키 없이 기록하고 나중에 공개한다
--   tastings.flight_id / flight_position(잔 번호) / blind_guess(블라인드 때 적은 추측)
--   tastings.whisky_id는 공개 전 블라인드 잔에 한해 NULL 허용 (CHECK). 목록·통계 쿼리는
--   whiskies!inner 또는 whisky_id IS NOT NULL 조건으로 공개 전 잔을 제외한다.

CREATE TABLE whisky_note.flights (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users DEFAULT auth.uid(),
  name text NOT NULL CHECK (char_length(btrim(name)) > 0),
  tasted_at date NOT NULL DEFAULT CURRENT_DATE,
  location text,
  blind boolean NOT NULL DEFAULT false,
  note text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX flights_user_idx ON whisky_note.flights (user_id, tasted_at DESC);

ALTER TABLE whisky_note.flights ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users own flights" ON whisky_note.flights
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
GRANT ALL ON whisky_note.flights TO authenticated;

ALTER TABLE whisky_note.tastings
  ADD COLUMN flight_id uuid REFERENCES whisky_note.flights ON DELETE CASCADE,
  ADD COLUMN flight_position smallint CHECK (flight_position > 0),
  ADD COLUMN blind_guess text,
  ALTER COLUMN whisky_id DROP NOT NULL,
  ADD CONSTRAINT tastings_whisky_or_flight CHECK (whisky_id IS NOT NULL OR flight_id IS NOT NULL);

CREATE INDEX tastings_flight_idx ON whisky_note.tastings (flight_id, flight_position);

CREATE OR REPLACE FUNCTION whisky_note.save_tasting(
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
  v_old whisky_note.tastings;
BEGIN
  IF p_id IS NULL THEN
    INSERT INTO whisky_note.tastings (
      whisky_id, bottle_id, tasted_at, location,
      nose_score, palate_score, finish_score, overall_score, serve,
      nose_intensity, palate_body, palate_sweetness, palate_texture,
      finish_length, finish_character,
      nose_note, palate_note, finish_note, comment, pairing,
      would_buy_again, price_paid, pour_ml, color, photo_url,
      flight_id, flight_position, blind_guess
    ) VALUES (
      r.whisky_id, r.bottle_id, r.tasted_at, r.location,
      r.nose_score, r.palate_score, r.finish_score, r.overall_score, r.serve,
      r.nose_intensity, r.palate_body, r.palate_sweetness, coalesce(r.palate_texture, '{}'),
      r.finish_length, coalesce(r.finish_character, '{}'),
      r.nose_note, r.palate_note, r.finish_note, r.comment, r.pairing,
      r.would_buy_again, r.price_paid, r.pour_ml, r.color, r.photo_url,
      r.flight_id, r.flight_position, r.blind_guess
    )
    RETURNING id INTO v_id;
  ELSE
    SELECT * INTO v_old FROM whisky_note.tastings WHERE id = p_id FOR UPDATE;
    IF NOT FOUND THEN
      RAISE EXCEPTION '시음 노트를 찾지 못했습니다.' USING ERRCODE = 'P0002';
    END IF;
    -- 수정은 정정으로 본다: 이전에 따른 양을 이전 보틀에 되돌린 뒤 아래에서 새 값을 차감
    IF v_old.bottle_id IS NOT NULL AND v_old.pour_ml IS NOT NULL THEN
      UPDATE whisky_note.bottles
      SET remaining_pct = least(100, remaining_pct + round(v_old.pour_ml * 100.0 / size_ml))
      WHERE id = v_old.bottle_id;
    END IF;

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
      would_buy_again = r.would_buy_again, price_paid = r.price_paid, pour_ml = r.pour_ml,
      color = r.color, photo_url = r.photo_url,
      flight_id = r.flight_id, flight_position = r.flight_position, blind_guess = r.blind_guess
    WHERE id = p_id
    RETURNING id INTO v_id;
    DELETE FROM whisky_note.tasting_aromas WHERE tasting_id = v_id;
  END IF;

  -- 연결한 보틀: 미개봉이면 시음일로 개봉 처리, 따른 양만큼 잔량 차감 (CASE의 컬럼은 변경 전 값)
  IF r.bottle_id IS NOT NULL THEN
    UPDATE whisky_note.bottles SET
      status = CASE WHEN status = 'unopened' THEN 'open' ELSE status END,
      open_date = CASE WHEN status = 'unopened' THEN coalesce(open_date, r.tasted_at) ELSE open_date END,
      remaining_pct = CASE
        WHEN r.pour_ml IS NULL THEN remaining_pct
        ELSE greatest(0, remaining_pct - round(r.pour_ml * 100.0 / size_ml))
      END
    WHERE id = r.bottle_id;
  END IF;

  INSERT INTO whisky_note.tasting_aromas (tasting_id, stage, tag_id)
  SELECT DISTINCT v_id, a.stage, a.tag_id
  FROM jsonb_to_recordset(p_aromas) AS a(stage text, tag_id smallint);

  RETURN v_id;
END;
$$;

