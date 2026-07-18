'use client';

import { useActionState, useState } from 'react';
import { signIn, signUp, type AuthState } from './actions';
import { GlencairnArt } from '@/components/ui';

const initialState: AuthState = {};

export default function LoginPage() {
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [signInState, signInAction, signInPending] = useActionState(signIn, initialState);
  const [signUpState, signUpAction, signUpPending] = useActionState(signUp, initialState);

  const state = mode === 'signin' ? signInState : signUpState;
  const pending = mode === 'signin' ? signInPending : signUpPending;

  return (
    <main
      className="min-h-screen flex flex-col items-center justify-center px-6 pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)]"
      style={{
        backgroundImage:
          'radial-gradient(ellipse 70% 50% at 50% 0%, rgba(201, 150, 63, 0.06), transparent)',
      }}
    >
      <div className="w-full max-w-sm">
        <header className="text-center mb-12">
          <GlencairnArt className="w-12 h-12 mx-auto mb-5 text-accent" />
          <p className="text-accent text-[13px] tracking-[0.3em] uppercase mb-3">Whisky Note</p>
          <h1 className="font-display text-[36px] leading-tight">
            한 잔의 기억을
            <br />
            기록하다
          </h1>
        </header>

        <form action={mode === 'signin' ? signInAction : signUpAction} className="space-y-4">
          <div>
            <label htmlFor="email" className="block text-sm text-muted mb-1.5">
              이메일
            </label>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              className="w-full h-12 px-4 rounded-(--radius-utility) bg-tile-1 border border-hairline placeholder:text-faint"
              placeholder="you@example.com"
            />
          </div>
          <div>
            <label htmlFor="password" className="block text-sm text-muted mb-1.5">
              비밀번호
            </label>
            <input
              id="password"
              name="password"
              type="password"
              autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
              required
              minLength={mode === 'signup' ? 8 : undefined}
              className="w-full h-12 px-4 rounded-(--radius-utility) bg-tile-1 border border-hairline placeholder:text-faint"
              placeholder={mode === 'signup' ? '8자 이상' : '••••••••'}
            />
          </div>

          {state.error && <p className="text-danger text-sm">{state.error}</p>}
          {state.message && <p className="text-accent-bright text-sm">{state.message}</p>}

          <button
            type="submit"
            disabled={pending}
            className="w-full h-12 rounded-full bg-accent text-on-accent font-semibold disabled:opacity-50"
          >
            {pending ? '처리 중…' : mode === 'signin' ? '로그인' : '가입하기'}
          </button>
        </form>

        <p className="text-center text-muted text-sm mt-8">
          {mode === 'signin' ? '아직 계정이 없나요?' : '이미 계정이 있나요?'}{' '}
          <button
            type="button"
            onClick={() => setMode(mode === 'signin' ? 'signup' : 'signin')}
            className="text-accent-bright"
          >
            {mode === 'signin' ? '가입하기' : '로그인'}
          </button>
        </p>
      </div>
    </main>
  );
}
