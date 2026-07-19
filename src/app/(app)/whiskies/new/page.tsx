'use client';

import { useActionState, useRef, useState } from 'react';
import { addWhiskyFromCatalog, createWhisky, type FormState } from '../actions';
import { CatalogSearch } from '@/components/catalog-search';
import { WhiskyFields } from '@/components/whisky-fields';
import { SubmitButton } from '@/components/form';
import { PhotoInput } from '@/components/photo-input';
import { Card, Eyebrow } from '@/components/ui';
import { CATEGORY_LABELS, type CatalogEntry } from '@/lib/types';

export default function NewWhiskyPage() {
  const [state, action, pending] = useActionState<FormState, FormData>(createWhisky, {});
  const [selected, setSelected] = useState<CatalogEntry | null>(null);
  const catalogFormRef = useRef<HTMLFormElement>(null);

  return (
    <div className="max-w-lg">
      <header className="mb-8">
        <Eyebrow>Whisky</Eyebrow>
        <h1 className="font-display text-[30px]">위스키 등록</h1>
      </header>

      <section className="space-y-4">
        <p className="text-muted text-sm">
          카탈로그에서 검색해 선택하면 바로 등록됩니다. 이미 등록한 위스키를 선택하면 해당
          상세로 이동합니다.
        </p>
        <CatalogSearch autoFocus onSelect={setSelected} />

        {selected && (
          <Card>
            <p className="font-display text-[20px]">{selected.name_ko ?? selected.name}</p>
            <p className="text-sm text-muted mt-1">
              {[
                selected.name_ko ? selected.name : selected.distillery,
                selected.region ?? selected.country,
                CATEGORY_LABELS[selected.category],
                selected.age_years ? `${selected.age_years}년` : null,
                selected.abv ? `${selected.abv}%` : null,
                selected.cask_type,
              ]
                .filter(Boolean)
                .join(' · ')}
            </p>
            <form action={addWhiskyFromCatalog} ref={catalogFormRef} className="mt-4">
              <input type="hidden" name="catalog_id" value={selected.id} />
              <button
                type="submit"
                className="w-full h-11 rounded-full bg-accent text-on-accent font-semibold"
              >
                이 위스키 등록
              </button>
            </form>
          </Card>
        )}
      </section>

      <details className="mt-10">
        <summary className="text-sm text-faint cursor-pointer select-none">
          카탈로그에 없는 위스키를 직접 입력해 등록
        </summary>
        <form action={action} className="space-y-6 mt-4">
          <WhiskyFields />
          <PhotoInput name="image_url" label="보틀 사진" />
          {state.error && <p className="text-danger text-sm">{state.error}</p>}
          <SubmitButton pending={pending}>직접 입력으로 등록</SubmitButton>
        </form>
      </details>
    </div>
  );
}
