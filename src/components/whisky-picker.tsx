'use client';

import { useEffect, useMemo, useState, useTransition } from 'react';
import { searchCatalog } from '@/app/(app)/whiskies/lookup';
import { inputClass } from './form';
import { WhiskyFields } from './whisky-fields';
import { MANUAL_PREFIX, PICK_CATALOG, PICK_MANUAL } from '@/lib/whisky-resolve';
import { CATEGORY_LABELS, type CatalogEntry } from '@/lib/types';

export interface PickerWhisky {
  id: string;
  name: string;
  catalog_id: string | null;
}

type Picked =
  | { kind: 'mine'; whisky: PickerWhisky }
  | { kind: 'catalog'; entry: CatalogEntry }
  | { kind: 'manual'; name: string };

/** 공백·대소문자 무시 부분 일치 */
function normalize(s: string): string {
  return s.toLowerCase().replace(/\s+/g, '');
}

/**
 * 위스키 선택 — 내 위스키와 카탈로그를 한 입력창에서 검색하고, 없으면 그 자리에서 직접 입력.
 * 제출 값: whisky_id(내 위스키 id | __catalog__ | __manual__), catalog_id, new_* 필드.
 * allowCreate=false면 내 위스키만 고를 수 있다(노트 편집 등).
 */
export function WhiskyPicker({
  whiskies,
  defaultWhiskyId,
  defaultCatalog,
  allowCreate = true,
  onChange,
}: {
  whiskies: PickerWhisky[];
  defaultWhiskyId?: string;
  defaultCatalog?: CatalogEntry | null;
  allowCreate?: boolean;
  /** 내 위스키를 골랐을 때 그 id, 그 외(카탈로그·직접 입력·미선택)는 null */
  onChange?: (whiskyId: string | null) => void;
}) {
  const [picked, setPicked] = useState<Picked | null>(() => {
    const mine = whiskies.find((w) => w.id === defaultWhiskyId);
    if (mine) return { kind: 'mine', whisky: mine };
    if (defaultCatalog) {
      const linked = whiskies.find((w) => w.catalog_id === defaultCatalog.id);
      return linked ? { kind: 'mine', whisky: linked } : { kind: 'catalog', entry: defaultCatalog };
    }
    return null;
  });
  const [query, setQuery] = useState('');
  const [catalogResults, setCatalogResults] = useState<CatalogEntry[]>([]);
  const [searched, setSearched] = useState(false);
  const [, startSearch] = useTransition();

  const mineMatches = useMemo(() => {
    const q = normalize(query);
    if (!q) return [];
    return whiskies.filter((w) => normalize(w.name).includes(q)).slice(0, 6);
  }, [query, whiskies]);

  useEffect(() => {
    if (!allowCreate || query.trim().length < 2) {
      setCatalogResults([]);
      setSearched(false);
      return;
    }
    const timer = setTimeout(() => {
      startSearch(async () => {
        setCatalogResults(await searchCatalog(query));
        setSearched(true);
      });
    }, 300);
    return () => clearTimeout(timer);
  }, [query, allowCreate]);

  function pick(next: Picked | null) {
    setPicked(next);
    setQuery('');
    onChange?.(next?.kind === 'mine' ? next.whisky.id : null);
  }

  // 이미 내 위스키로 등록된 카탈로그 항목은 "내 위스키"로 고르게 한다
  const linkedByCatalog = useMemo(
    () => new Map(whiskies.filter((w) => w.catalog_id).map((w) => [w.catalog_id!, w])),
    [whiskies]
  );

  const hiddenValue =
    picked?.kind === 'mine'
      ? picked.whisky.id
      : picked?.kind === 'catalog'
        ? PICK_CATALOG
        : picked?.kind === 'manual'
          ? PICK_MANUAL
          : '';

  return (
    <div>
      <input type="hidden" name="whisky_id" value={hiddenValue} />
      <input
        type="hidden"
        name="catalog_id"
        value={picked?.kind === 'catalog' ? picked.entry.id : ''}
      />

      {picked ? (
        <div className="flex items-center justify-between gap-3 bg-tile-1 border border-accent/40 rounded-(--radius-utility) px-3.5 py-2.5">
          <div className="min-w-0">
            <p className="font-semibold truncate">
              {picked.kind === 'mine'
                ? picked.whisky.name
                : picked.kind === 'catalog'
                  ? (picked.entry.name_ko ?? picked.entry.name)
                  : '직접 입력'}
            </p>
            <p className="text-xs text-muted mt-0.5">
              {picked.kind === 'mine'
                ? '내 위스키'
                : picked.kind === 'catalog'
                  ? '카탈로그 — 저장할 때 내 위스키로 등록됩니다'
                  : '아래 정보로 새 위스키를 등록합니다'}
            </p>
          </div>
          <button
            type="button"
            onClick={() => pick(null)}
            className="shrink-0 h-8 px-3 rounded-full border border-hairline text-sm text-muted"
          >
            변경
          </button>
        </div>
      ) : (
        <div>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={
              allowCreate ? '위스키 이름 검색 — 내 위스키 + 카탈로그' : '내 위스키 이름 검색'
            }
            className={inputClass}
            aria-label="위스키 검색"
          />
          {query.trim() && (
            <ul className="mt-2 border border-hairline rounded-(--radius-utility) divide-y divide-hairline-soft overflow-hidden max-h-96 overflow-y-auto">
              {mineMatches.map((w) => (
                <li key={w.id}>
                  <button
                    type="button"
                    onClick={() => pick({ kind: 'mine', whisky: w })}
                    className="w-full text-left px-3.5 py-2.5 hover:bg-tile-2"
                  >
                    <p className="text-[15px] font-semibold">{w.name}</p>
                    <p className="text-xs text-accent mt-0.5">내 위스키</p>
                  </button>
                </li>
              ))}
              {catalogResults
                .filter((entry) => !mineMatches.some((w) => w.catalog_id === entry.id))
                .map((entry) => {
                  const linked = linkedByCatalog.get(entry.id);
                  return (
                    <li key={entry.id}>
                      <button
                        type="button"
                        onClick={() =>
                          pick(
                            linked ? { kind: 'mine', whisky: linked } : { kind: 'catalog', entry }
                          )
                        }
                        className="w-full text-left px-3.5 py-2.5 hover:bg-tile-2"
                      >
                        <p className="text-[15px] font-semibold">{entry.name_ko ?? entry.name}</p>
                        <p className="text-xs text-muted mt-0.5">
                          {[
                            linked ? '내 위스키' : '카탈로그',
                            entry.name_ko ? entry.name : null,
                            CATEGORY_LABELS[entry.category],
                            entry.abv ? `${entry.abv}%` : null,
                          ]
                            .filter(Boolean)
                            .join(' · ')}
                        </p>
                      </button>
                    </li>
                  );
                })}
              {allowCreate && (
                <li>
                  <button
                    type="button"
                    onClick={() => pick({ kind: 'manual', name: query.trim() })}
                    className="w-full text-left px-3.5 py-2.5 hover:bg-tile-2 text-sm text-muted"
                  >
                    + &lsquo;{query.trim()}&rsquo; 직접 입력해 등록
                  </button>
                </li>
              )}
              {!allowCreate && mineMatches.length === 0 && (
                <li className="px-3.5 py-2.5 text-sm text-muted">일치하는 위스키가 없습니다.</li>
              )}
            </ul>
          )}
          {allowCreate && searched && catalogResults.length === 0 && mineMatches.length === 0 && (
            <p className="text-xs text-faint mt-2">
              카탈로그에서 찾지 못했습니다. 다른 표기(영문/한글)로 검색하거나 직접 입력하세요.
            </p>
          )}
        </div>
      )}

      {picked?.kind === 'manual' && (
        <div className="mt-4 bg-tile-1 border border-hairline rounded-(--radius-card) p-4">
          <WhiskyFields prefix={MANUAL_PREFIX} defaults={{ name: picked.name }} />
        </div>
      )}
    </div>
  );
}
