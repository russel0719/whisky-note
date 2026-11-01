'use client';

import { useState } from 'react';
import { addWishlistFromCatalog, addWishlistManual } from './actions';
import { CatalogSearch } from '@/components/catalog-search';
import { inputClass } from '@/components/form';
import type { CatalogEntry } from '@/lib/types';

/** 위시리스트 추가 — 카탈로그 검색으로 고르거나, 없으면 이름만 적어 추가 */
export function WishlistAdd() {
  const [selected, setSelected] = useState<CatalogEntry | null>(null);
  // 추가 후 검색창을 비우기 위해 키를 바꿔 다시 마운트
  const [searchKey, setSearchKey] = useState(0);

  return (
    <div className="space-y-4">
      <CatalogSearch key={searchKey} onSelect={setSelected} />
      {selected && (
        <form
          action={async (formData) => {
            await addWishlistFromCatalog(formData);
            setSelected(null);
            setSearchKey((k) => k + 1);
          }}
          className="flex items-center justify-between gap-3"
        >
          <input type="hidden" name="catalog_id" value={selected.id} />
          <p className="text-sm text-accent-bright min-w-0 truncate">
            {selected.name_ko ?? selected.name}
          </p>
          <button
            type="submit"
            className="shrink-0 h-10 px-5 rounded-full bg-accent text-on-accent text-sm font-semibold"
          >
            위시리스트에 추가
          </button>
        </form>
      )}

      <details>
        <summary className="text-sm text-faint cursor-pointer select-none">
          카탈로그에 없는 위스키를 이름으로 추가
        </summary>
        <form action={addWishlistManual} className="mt-3 space-y-2">
          <input name="name" required placeholder="위스키 이름" className={inputClass} />
          <input name="note" placeholder="메모 — 예: OO바에서 추천받음" className={inputClass} />
          <button
            type="submit"
            className="h-10 px-5 rounded-full border border-accent text-accent-bright text-sm"
          >
            추가
          </button>
        </form>
      </details>
    </div>
  );
}
