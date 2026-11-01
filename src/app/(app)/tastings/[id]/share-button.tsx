'use client';

import { useState } from 'react';

/** 공유 카드 PNG를 받아 시스템 공유 시트(모바일)로, 안 되면 내려받기로 */
export function ShareCardButton({ tastingId, fileName }: { tastingId: string; fileName: string }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function share() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/tastings/${tastingId}/card`);
      if (!res.ok) throw new Error(await res.text());
      const blob = await res.blob();
      const file = new File([blob], `${fileName}.png`, { type: 'image/png' });
      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], title: fileName });
      } else {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = file.name;
        a.click();
        URL.revokeObjectURL(url);
      }
    } catch (err) {
      // 사용자가 공유 시트를 닫은 경우는 오류가 아니다
      if ((err as Error).name !== 'AbortError') setError('카드를 만들지 못했습니다.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <span className="inline-flex items-center gap-2">
      <button
        type="button"
        onClick={share}
        disabled={busy}
        className="h-9 px-4 inline-flex items-center rounded-full border border-hairline text-muted text-sm disabled:opacity-50"
      >
        {busy ? '카드 만드는 중…' : '공유 카드'}
      </button>
      {error && <span className="text-danger text-xs">{error}</span>}
    </span>
  );
}
