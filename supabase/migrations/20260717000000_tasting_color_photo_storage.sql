-- Phase 1: 시음 컬러/사진 기록 + 사진 업로드용 Storage 버킷

-- 위스키 색상 (12단계 팔레트 키, src/lib/types.ts WHISKY_COLORS와 동기)
ALTER TABLE whisky_note.tastings ADD COLUMN color text;

-- 시음 사진 (Storage public URL)
ALTER TABLE whisky_note.tastings ADD COLUMN photo_url text;

-- ---------------------------------------------------------------------------
-- Storage: whisky-note 전용 버킷 (public — 사진은 민감정보가 아니고 렌더링 단순화)
-- 업로드 경로 규약: {user_id}/{uuid}.{ext}  → 소유자만 쓰기/삭제 가능
-- 주의: storage.objects 정책은 공용 Supabase 프로젝트 전체에서 공유되므로
--       반드시 whisky_note_ 접두사와 bucket_id 조건을 유지할 것.
-- ---------------------------------------------------------------------------
INSERT INTO storage.buckets (id, name, public)
VALUES ('whisky-note', 'whisky-note', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "whisky_note_insert_own" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'whisky-note'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "whisky_note_update_own" ON storage.objects
  FOR UPDATE TO authenticated
  USING (
    bucket_id = 'whisky-note'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "whisky_note_delete_own" ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'whisky-note'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );
