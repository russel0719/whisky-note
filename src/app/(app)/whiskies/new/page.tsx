'use client';

import { useActionState } from 'react';
import { createWhisky, type FormState } from '../actions';
import { WhiskyFields } from '@/components/whisky-fields';
import { SubmitButton } from '@/components/form';

export default function NewWhiskyPage() {
  const [state, action, pending] = useActionState<FormState, FormData>(createWhisky, {});

  return (
    <div className="max-w-lg">
      <header className="mb-8">
        <p className="text-accent text-sm tracking-[0.25em] uppercase mb-2">Whisky</p>
        <h1 className="text-[28px]">위스키 등록</h1>
      </header>
      <form action={action} className="space-y-6">
        <WhiskyFields />
        {state.error && <p className="text-danger text-sm">{state.error}</p>}
        <SubmitButton pending={pending}>등록</SubmitButton>
      </form>
    </div>
  );
}
