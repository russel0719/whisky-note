-- 글로벌 위스키 카탈로그 (공용 읽기 전용 마스터)
-- 시드 데이터는 scripts/generate-catalog.mjs 로 생성된 별도 마이그레이션에서 삽입한다.

CREATE TABLE whisky_note.catalog (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  distillery text,
  category text NOT NULL CHECK (category IN (
    'single_malt', 'blended', 'blended_malt', 'grain',
    'bourbon', 'rye', 'irish', 'japanese', 'other'
  )),
  region text,
  country text,
  abv numeric(4, 1) CHECK (abv > 0 AND abv < 100),
  age_years int CHECK (age_years > 0),
  cask_type text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX catalog_name_idx ON whisky_note.catalog (lower(name));
CREATE INDEX catalog_distillery_idx ON whisky_note.catalog (lower(distillery));

ALTER TABLE whisky_note.catalog ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Catalog readable" ON whisky_note.catalog
  FOR SELECT TO authenticated USING (true);

GRANT SELECT ON whisky_note.catalog TO authenticated;
