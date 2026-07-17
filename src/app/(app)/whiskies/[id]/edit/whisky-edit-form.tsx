'use client';

import { useActionState } from 'react';
import { updateWhisky, type FormState } from '../../actions';
import { SubmitButton } from '@/components/form';
import { PhotoInput } from '@/components/photo-input';
import { Eyebrow } from '@/components/ui';
import { WhiskyFields } from '@/components/whisky-fields';
import type { Whisky } from '@/lib/types';

export function WhiskyEditForm({ whisky }: { whisky: Whisky }) {
  const [state, action, pending] = useActionState<FormState, FormData>(updateWhisky, {});

  return (
    <div className="max-w-lg">
      <header className="mb-8">
        <Eyebrow>Whisky</Eyebrow>
        <h1 className="font-display text-[30px]">위스키 수정</h1>
      </header>
      <form action={action} className="space-y-6">
        <input type="hidden" name="id" value={whisky.id} />
        <WhiskyFields defaults={whisky} />
        <PhotoInput name="image_url" label="보틀 사진" defaultUrl={whisky.image_url} />
        {state.error && <p className="text-danger text-sm">{state.error}</p>}
        <SubmitButton pending={pending}>저장</SubmitButton>
      </form>
    </div>
  );
}
