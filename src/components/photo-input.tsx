'use client';

import { useRef, useState } from 'react';
import { createClient } from '@/lib/supabase/client';

const BUCKET = 'whisky-note';

/**
 * 사진 업로드 필드. 파일 선택 시 Storage에 바로 올리고,
 * hidden input(name)에 public URL을 담아 서버 액션으로 전달한다.
 */
export function PhotoInput({
  name,
  defaultUrl,
  label = '사진',
}: {
  name: string;
  defaultUrl?: string | null;
  label?: string;
}) {
  const [url, setUrl] = useState<string | null>(defaultUrl ?? null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  async function handleFile(file: File) {
    setError(null);
    setUploading(true);
    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error('로그인이 필요합니다.');

      const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg';
      const path = `${user.id}/${crypto.randomUUID()}.${ext}`;
      const { error: uploadError } = await supabase.storage
        .from(BUCKET)
        .upload(path, file, { contentType: file.type, upsert: false });
      if (uploadError) throw uploadError;

      const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
      setUrl(data.publicUrl);
    } catch (e) {
      setError(e instanceof Error ? e.message : '업로드에 실패했습니다.');
    } finally {
      setUploading(false);
    }
  }

  return (
    <div>
      <p className="text-sm text-muted mb-1.5">{label}</p>
      <input type="hidden" name={name} value={url ?? ''} />
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        className="sr-only"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) void handleFile(file);
        }}
      />
      {url ? (
        <div className="relative rounded-(--radius-card) overflow-hidden border border-hairline">
          {/* Storage public URL은 도메인이 가변적이라 next/image 대신 img 사용 */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={url} alt="업로드한 사진" className="w-full max-h-64 object-cover" />
          <div className="absolute top-2 right-2 flex gap-2">
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="h-8 px-3 rounded-full bg-nav/80 backdrop-blur text-xs"
            >
              변경
            </button>
            <button
              type="button"
              onClick={() => setUrl(null)}
              className="h-8 px-3 rounded-full bg-nav/80 backdrop-blur text-xs text-danger"
            >
              제거
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          disabled={uploading}
          onClick={() => fileRef.current?.click()}
          className="w-full h-24 rounded-(--radius-card) border border-dashed border-hairline text-muted text-sm disabled:opacity-50"
        >
          {uploading ? '업로드 중…' : '+ 사진 추가'}
        </button>
      )}
      {error && <p className="text-danger text-sm mt-1.5">{error}</p>}
    </div>
  );
}
