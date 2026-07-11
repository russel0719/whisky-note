-- Whisky Note 초기 스키마
-- 스키마 분리 원칙(~/.claude/CLAUDE.md 3.1)에 따라 whisky_note 스키마 사용.
-- 적용 후 Supabase 대시보드 > Settings > API > Exposed schemas 에 whisky_note 추가 필요.

CREATE SCHEMA IF NOT EXISTS whisky_note;

GRANT USAGE ON SCHEMA whisky_note TO anon, authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA whisky_note
  GRANT ALL ON TABLES TO anon, authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA whisky_note
  GRANT ALL ON SEQUENCES TO anon, authenticated;

-- ---------------------------------------------------------------------------
-- 위스키 마스터
-- ---------------------------------------------------------------------------
CREATE TABLE whisky_note.whiskies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users DEFAULT auth.uid(),
  name text NOT NULL,
  distillery text,
  category text NOT NULL CHECK (category IN (
    'single_malt', 'blended', 'blended_malt', 'grain',
    'bourbon', 'rye', 'irish', 'japanese', 'other'
  )),
  region text,
  abv numeric(4, 1) CHECK (abv > 0 AND abv <= 100),
  age_years int CHECK (age_years > 0),
  cask_type text,
  image_url text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX whiskies_user_idx ON whisky_note.whiskies (user_id, name);

ALTER TABLE whisky_note.whiskies ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users own whiskies" ON whisky_note.whiskies
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- 보틀 (구매 기록). 개봉 경과는 open_date와 시음일의 차이로 계산한다.
-- ---------------------------------------------------------------------------
CREATE TABLE whisky_note.bottles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users DEFAULT auth.uid(),
  whisky_id uuid NOT NULL REFERENCES whisky_note.whiskies ON DELETE CASCADE,
  purchase_date date NOT NULL DEFAULT CURRENT_DATE,
  purchase_price int CHECK (purchase_price >= 0),
  purchase_place text,
  size_ml int NOT NULL DEFAULT 700 CHECK (size_ml > 0),
  open_date date,
  remaining_pct int NOT NULL DEFAULT 100 CHECK (remaining_pct BETWEEN 0 AND 100),
  status text NOT NULL DEFAULT 'unopened' CHECK (status IN ('unopened', 'open', 'finished')),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX bottles_user_idx ON whisky_note.bottles (user_id, purchase_date DESC);
CREATE INDEX bottles_whisky_idx ON whisky_note.bottles (whisky_id);

ALTER TABLE whisky_note.bottles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users own bottles" ON whisky_note.bottles
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- 시음 노트. bottle_id가 NULL이면 바/모임 등 보틀 외 시음.
-- 점수는 100점제 (nose / palate / finish / overall).
-- ---------------------------------------------------------------------------
CREATE TABLE whisky_note.tastings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users DEFAULT auth.uid(),
  whisky_id uuid NOT NULL REFERENCES whisky_note.whiskies ON DELETE CASCADE,
  bottle_id uuid REFERENCES whisky_note.bottles ON DELETE SET NULL,
  tasted_at date NOT NULL DEFAULT CURRENT_DATE,
  location text,
  nose_score int CHECK (nose_score BETWEEN 0 AND 100),
  palate_score int CHECK (palate_score BETWEEN 0 AND 100),
  finish_score int CHECK (finish_score BETWEEN 0 AND 100),
  overall_score int CHECK (overall_score BETWEEN 0 AND 100),
  nose_note text,
  palate_note text,
  finish_note text,
  comment text,
  pairing text,
  would_buy_again text CHECK (would_buy_again IN ('yes', 'no', 'maybe')),
  price_paid int CHECK (price_paid >= 0),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX tastings_user_idx ON whisky_note.tastings (user_id, tasted_at DESC);
CREATE INDEX tastings_whisky_idx ON whisky_note.tastings (whisky_id);
CREATE INDEX tastings_bottle_idx ON whisky_note.tastings (bottle_id);

ALTER TABLE whisky_note.tastings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users own tastings" ON whisky_note.tastings
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- 아로마 휠 태그 (공용 마스터, 읽기 전용)
-- ---------------------------------------------------------------------------
CREATE TABLE whisky_note.aroma_tags (
  id smallint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  name text NOT NULL UNIQUE,
  grp text NOT NULL CHECK (grp IN (
    'fruit', 'floral', 'sweet', 'cereal', 'peat', 'sherry', 'wood', 'spice', 'other'
  ))
);

ALTER TABLE whisky_note.aroma_tags ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Tags readable" ON whisky_note.aroma_tags
  FOR SELECT TO authenticated USING (true);

CREATE TABLE whisky_note.tasting_aromas (
  tasting_id uuid NOT NULL REFERENCES whisky_note.tastings ON DELETE CASCADE,
  tag_id smallint NOT NULL REFERENCES whisky_note.aroma_tags ON DELETE CASCADE,
  PRIMARY KEY (tasting_id, tag_id)
);

CREATE INDEX tasting_aromas_tag_idx ON whisky_note.tasting_aromas (tag_id);

ALTER TABLE whisky_note.tasting_aromas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users own tasting aromas" ON whisky_note.tasting_aromas
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM whisky_note.tastings t
      WHERE t.id = tasting_id AND t.user_id = auth.uid()
    )
  ) WITH CHECK (
    EXISTS (
      SELECT 1 FROM whisky_note.tastings t
      WHERE t.id = tasting_id AND t.user_id = auth.uid()
    )
  );

GRANT ALL ON ALL TABLES IN SCHEMA whisky_note TO anon, authenticated;

-- ---------------------------------------------------------------------------
-- 아로마 태그 시드
-- ---------------------------------------------------------------------------
INSERT INTO whisky_note.aroma_tags (name, grp) VALUES
  ('사과', 'fruit'), ('배', 'fruit'), ('시트러스', 'fruit'), ('열대과일', 'fruit'),
  ('베리', 'fruit'), ('자두', 'fruit'), ('건포도', 'fruit'),
  ('꽃향', 'floral'), ('허브', 'floral'), ('풀내음', 'floral'),
  ('꿀', 'sweet'), ('바닐라', 'sweet'), ('카라멜', 'sweet'), ('초콜릿', 'sweet'), ('메이플', 'sweet'),
  ('몰트', 'cereal'), ('비스킷', 'cereal'), ('빵', 'cereal'), ('견과', 'cereal'),
  ('피트', 'peat'), ('스모크', 'peat'), ('요오드', 'peat'), ('재', 'peat'),
  ('셰리', 'sherry'), ('건과일', 'sherry'), ('와인', 'sherry'), ('럼', 'sherry'),
  ('오크', 'wood'), ('삼나무', 'wood'), ('타닌', 'wood'), ('토스트', 'wood'),
  ('시나몬', 'spice'), ('후추', 'spice'), ('생강', 'spice'), ('정향', 'spice'), ('감초', 'spice'),
  ('가죽', 'other'), ('담배', 'other'), ('커피', 'other'), ('민트', 'other'), ('바다내음', 'other');
