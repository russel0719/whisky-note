-- 과거 기록 가져오기 (/import)
--   tastings.source_score — 가져온 기록의 원래 점수(10점 척도 등). 환산식을 나중에 바꿔 다시
--   계산할 수 있도록 원점수를 보존한다.
--   import_tastings(p_rows) — 미리보기에서 확정한 행을 한 트랜잭션으로 저장한다.
--     행 키: whisky_id | catalog_id | name+category (위스키 결정 순서),
--            tasted_at, score, source_score, price(원), bottle_status(unopened|open|finished)
--     price가 있으면 보틀을 만들고 시음을 그 보틀에 연결한다.

ALTER TABLE whisky_note.tastings ADD COLUMN source_score numeric(4, 1);

CREATE FUNCTION whisky_note.import_tastings(p_rows jsonb)
RETURNS int
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
DECLARE
  r_row jsonb;
  v_whisky uuid;
  v_bottle uuid;
  v_status text;
  v_date date;
  v_count int := 0;
BEGIN
  FOR r_row IN SELECT * FROM jsonb_array_elements(p_rows) LOOP
    v_date := (r_row ->> 'tasted_at')::date;

    IF r_row ->> 'whisky_id' IS NOT NULL THEN
      v_whisky := (r_row ->> 'whisky_id')::uuid;
    ELSIF r_row ->> 'catalog_id' IS NOT NULL THEN
      v_whisky := whisky_note.ensure_whisky_from_catalog((r_row ->> 'catalog_id')::uuid);
    ELSE
      INSERT INTO whisky_note.whiskies (name, category)
      VALUES (btrim(r_row ->> 'name'), coalesce(r_row ->> 'category', 'other'))
      RETURNING id INTO v_whisky;
    END IF;

    v_bottle := NULL;
    IF r_row ->> 'price' IS NOT NULL THEN
      v_status := coalesce(r_row ->> 'bottle_status', 'finished');
      INSERT INTO whisky_note.bottles
        (whisky_id, purchase_date, purchase_price, open_date, remaining_pct, status)
      VALUES (
        v_whisky, v_date, (r_row ->> 'price')::int,
        CASE WHEN v_status = 'unopened' THEN NULL ELSE v_date END,
        CASE WHEN v_status = 'finished' THEN 0 ELSE 100 END,
        v_status
      )
      RETURNING id INTO v_bottle;
    END IF;

    INSERT INTO whisky_note.tastings (whisky_id, bottle_id, tasted_at, overall_score, source_score)
    VALUES (
      v_whisky, v_bottle, v_date,
      (r_row ->> 'score')::int, (r_row ->> 'source_score')::numeric
    );
    v_count := v_count + 1;
  END LOOP;
  RETURN v_count;
END;
$$;

REVOKE EXECUTE ON FUNCTION whisky_note.import_tastings(jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION whisky_note.import_tastings(jsonb) TO authenticated;
