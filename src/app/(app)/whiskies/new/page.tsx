'use client';

import { useActionState, useEffect, useState, useTransition } from 'react';
import { createWhisky, type FormState } from '../actions';
import {
  lookupWhiskyInfo,
  type RateLimitBucket,
  type WhiskyLookupResult,
} from '../lookup';
import { WhiskyFields } from '@/components/whisky-fields';
import { inputClass, SubmitButton } from '@/components/form';
import { PhotoInput } from '@/components/photo-input';
import { Eyebrow } from '@/components/ui';
import type { Whisky } from '@/lib/types';

const CONFIDENCE_LABELS = { high: '신뢰도 높음', medium: '신뢰도 보통', low: '신뢰도 낮음' };

// gpt-oss-120b free tier가 분당 5회이므로 12초 간격으로 재요청을 막는다
const COOLDOWN_SECONDS = 12;

const BUCKET_KIND_LABELS: Record<string, string> = { requests: '요청', tokens: '토큰' };
const BUCKET_WINDOW_LABELS: Record<string, string> = { minute: '분', hour: '시간', day: '일' };

function bucketLabel(name: string): string {
  const [kind, window] = name.split('-');
  const kindLabel = BUCKET_KIND_LABELS[kind];
  const windowLabel = BUCKET_WINDOW_LABELS[window];
  return kindLabel && windowLabel ? `${windowLabel}당 ${kindLabel}` : name;
}

function RateLimitLine({ buckets }: { buckets: RateLimitBucket[] }) {
  const visible = buckets.filter((b) => b.remaining != null && b.limit != null);
  if (visible.length === 0) return null;
  return (
    <p className="text-xs text-faint mt-1 tabular-nums">
      {visible
        .map(
          (b) =>
            `${bucketLabel(b.name)} ${b.remaining!.toLocaleString()}/${b.limit!.toLocaleString()} 남음`
        )
        .join(' · ')}
    </p>
  );
}

export default function NewWhiskyPage() {
  const [state, action, pending] = useActionState<FormState, FormData>(createWhisky, {});

  const [lookupName, setLookupName] = useState('');
  const [prefill, setPrefill] = useState<Partial<Whisky> | null>(null);
  const [prefillKey, setPrefillKey] = useState(0);
  const [lookup, setLookup] = useState<WhiskyLookupResult | null>(null);
  const [looking, startLookup] = useTransition();
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setInterval(() => setCooldown((s) => s - 1), 1000);
    return () => clearInterval(timer);
  }, [cooldown]);

  function runLookup() {
    if (!lookupName.trim() || looking || cooldown > 0) return;
    startLookup(async () => {
      const result = await lookupWhiskyInfo(lookupName);
      setLookup(result);
      setCooldown(COOLDOWN_SECONDS);
      if (result.fields) {
        setPrefill({ ...result.fields, category: result.fields.category ?? undefined });
        setPrefillKey((k) => k + 1);
      }
    });
  }

  const lookupDisabled = looking || cooldown > 0 || !lookupName.trim();

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
            disabled={lookupDisabled}
            className="h-11 px-4 rounded-full bg-accent text-on-accent text-sm font-semibold shrink-0 disabled:opacity-50 tabular-nums"
          >
            {looking ? '조회 중…' : cooldown > 0 ? `${cooldown}초` : '채우기'}
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
        {lookup?.usage && (
          <p className="text-xs text-faint mt-2 tabular-nums">
            이번 호출 {lookup.usage.total.toLocaleString()} 토큰 (프롬프트{' '}
            {lookup.usage.prompt.toLocaleString()} · 응답 {lookup.usage.completion.toLocaleString()})
          </p>
        )}
        {lookup?.rateLimits && <RateLimitLine buckets={lookup.rateLimits} />}
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
