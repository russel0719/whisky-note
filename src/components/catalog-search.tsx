'use client';

import { useEffect, useState, useTransition } from 'react';
import { searchCatalog } from '@/app/(app)/whiskies/lookup';
import { inputClass } from './form';
import { CATEGORY_LABELS, type CatalogEntry } from '@/lib/types';

/** 카탈로그 실시간 검색 (300ms 디바운스) + 결과 리스트. 선택 시 onSelect 호출. */
export function CatalogSearch({
  onSelect,
  placeholder = '이름 또는 증류소 — 예: Glenfiddich, Laphroaig',
  autoFocus,
}: {
  onSelect: (entry: CatalogEntry) => void;
  placeholder?: string;
  autoFocus?: boolean;
}) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<CatalogEntry[]>([]);
  const [searched, setSearched] = useState(false);
  const [, startSearch] = useTransition();

  useEffect(() => {
    if (query.trim().length < 2) {
      setResults([]);
      setSearched(false);
      return;
    }
    const timer = setTimeout(() => {
      startSearch(async () => {
        const found = await searchCatalog(query);
        setResults(found);
        setSearched(true);
      });
    }, 300);
    return () => clearTimeout(timer);
  }, [query]);

  return (
    <div>
      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder={placeholder}
        autoFocus={autoFocus}
        className={inputClass}
        aria-label="카탈로그 검색"
      />
      {results.length > 0 && (
        <ul className="mt-2 border border-hairline rounded-(--radius-utility) divide-y divide-hairline-soft overflow-hidden max-h-80 overflow-y-auto">
          {results.map((entry) => (
            <li key={entry.id}>
              <button
                type="button"
                onClick={() => {
                  onSelect(entry);
                  setResults([]);
                  setQuery(entry.name_ko ?? entry.name);
                }}
                className="w-full text-left px-3.5 py-2.5 hover:bg-tile-2"
              >
                <p className="text-[15px] font-semibold">{entry.name_ko ?? entry.name}</p>
                <p className="text-xs text-muted mt-0.5">
                  {[
                    entry.name_ko ? entry.name : null,
                    entry.region ?? entry.country,
                    CATEGORY_LABELS[entry.category],
                    entry.abv ? `${entry.abv}%` : null,
                  ]
                    .filter(Boolean)
                    .join(' · ')}
                </p>
              </button>
            </li>
          ))}
        </ul>
      )}
      {searched && results.length === 0 && (
        <p className="text-sm text-muted mt-2">
          카탈로그에서 찾지 못했습니다. 다른 표기(영문/한글)로 검색해보세요.
        </p>
      )}
    </div>
  );
}
