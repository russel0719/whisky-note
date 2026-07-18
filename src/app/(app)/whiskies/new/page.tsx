'use client';

import { useActionState, useState, useTransition } from 'react';
import { createWhisky, type FormState } from '../actions';
import { lookupWhiskyInfo, type WhiskyLookupResult } from '../lookup';
import { WhiskyFields } from '@/components/whisky-fields';
import { inputClass, SubmitButton } from '@/components/form';
import { PhotoInput } from '@/components/photo-input';
import { Eyebrow } from '@/components/ui';
import type { Whisky } from '@/lib/types';

const CONFIDENCE_LABELS = { high: '신뢰도 높음', medium: '신뢰도 보통', low: '신뢰도 낮음' };

export default function NewWhiskyPage() {
  const [state, action, pending] = useActionState<FormState, FormData>(createWhisky, {});

  const [lookupName, setLookupName] = useState('');
  const [prefill, setPrefill] = useState<Partial<Whisky> | null>(null);
  const [prefillKey, setPrefillKey] = useState(0);
  const [lookup, setLookup] = useState<WhiskyLookupResult | null>(null);
  const [looking, startLookup] = useTransition();

  function runLookup() {
    if (!lookupName.trim() || looking) return;
    startLookup(async () => {
      const result = await lookupWhiskyInfo(lookupName);
      setLookup(result);
      if (result.fields) {
        setPrefill({ ...result.fields, category: result.fields.category ?? undefined });
        setPrefillKey((k) => k + 1);
      }
    });
  }

  return (
    <div className="max-w-lg">
      <header className="mb-8">
        <Eyebrow>Whisky</Eyebrow>
        <h1 className="font-display text-[30px]">위스키 등록</h1>
      </header>

      <div className="bg-tile-1 border border-hairline rounded-(--radius-card) p-4 mb-6">
        <p className="text-sm font-semibold mb-2">AI 자동 채우기</p>
        <div className="flex gap-2">
          <input
            value={lookupName}
            onChange={(e) => setLookupName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                runLookup();
              }
            }}
            placeholder="예: Glenfiddich 18, 발베니 12 더블우드"
            className={`${inputClass} flex-1`}
          />
          <button
            type="button"
            onClick={runLookup}
            disabled={looking || !lookupName.trim()}
            className="h-11 px-4 rounded-full bg-accent text-on-accent text-sm font-semibold shrink-0 disabled:opacity-50"
          >
            {looking ? '조회 중…' : '채우기'}
          </button>
        </div>
        {lookup?.error && <p className="text-danger text-sm mt-2">{lookup.error}</p>}
        {lookup?.fields && (
          <p className="text-xs text-muted mt-2 leading-relaxed">
            {lookup.note ? `${lookup.note} · ` : ''}
            {CONFIDENCE_LABELS[lookup.confidence ?? 'low']} — AI가 추정한 정보입니다. 아래
            내용을 확인·수정 후 저장해주세요.
          </p>
        )}
      </div>

      <form action={action} className="space-y-6">
        <WhiskyFields key={prefillKey} defaults={prefill ?? undefined} />
        <PhotoInput name="image_url" label="보틀 사진" />
        {state.error && <p className="text-danger text-sm">{state.error}</p>}
        <SubmitButton pending={pending}>등록</SubmitButton>
      </form>
    </div>
  );
}
