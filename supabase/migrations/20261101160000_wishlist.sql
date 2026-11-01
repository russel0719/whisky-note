-- 위시리스트: 마셔보고 싶은(또는 사고 싶은) 위스키
--   catalog_id — 카탈로그에서 고른 항목 / whisky_id — 이미 등록한 내 위스키(바에서 마셔본 것 등)
--   둘 다 없으면 이름만 적은 항목. name은 표시용 스냅샷.

CREATE TABLE whisky_note.wishlist (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users DEFAULT auth.uid(),
  catalog_id uuid REFERENCES whisky_note.catalog ON DELETE SET NULL,
  whisky_id uuid REFERENCES whisky_note.whiskies ON DELETE CASCADE,
  name text NOT NULL CHECK (char_length(btrim(name)) > 0),
  note text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX wishlist_user_catalog_key ON whisky_note.wishlist (user_id, catalog_id);
CREATE UNIQUE INDEX wishlist_user_whisky_key ON whisky_note.wishlist (user_id, whisky_id);
CREATE INDEX wishlist_user_idx ON whisky_note.wishlist (user_id, created_at DESC);

ALTER TABLE whisky_note.wishlist ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users own wishlist" ON whisky_note.wishlist
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

GRANT ALL ON whisky_note.wishlist TO authenticated;
