'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { parseOptionalNumber, parseOptionalText } from '@/lib/parse';

export interface FormState {
  error?: string;
}

function revalidateBottleViews() {
  revalidatePath('/bottles');
  revalidatePath('/');
}

export async function createBottle(_prev: FormState, formData: FormData): Promise<FormState> {
  const whiskyId = String(formData.get('whisky_id') ?? '');
  if (!whiskyId) return { error: '위스키를 선택해주세요.' };

  const purchaseDate = String(formData.get('purchase_date') ?? '').trim();
  if (!purchaseDate) return { error: '구매일을 입력해주세요.' };

  const openDate = parseOptionalText(formData.get('open_date'));

  const supabase = await createClient();
  const { error } = await supabase.from('bottles').insert({
    whisky_id: whiskyId,
    purchase_date: purchaseDate,
    purchase_price: parseOptionalNumber(formData.get('purchase_price')),
    purchase_place: parseOptionalText(formData.get('purchase_place')),
    size_ml: parseOptionalNumber(formData.get('size_ml')) ?? 700,
    open_date: openDate,
    status: openDate ? 'open' : 'unopened',
  });
  if (error) return { error: `저장에 실패했습니다: ${error.message}` };

  revalidateBottleViews();
  redirect('/bottles');
}

export async function openBottle(formData: FormData): Promise<void> {
  const id = String(formData.get('id') ?? '');
  const openDate = String(formData.get('open_date') ?? '').trim();
  if (!id || !openDate) return;
  const supabase = await createClient();
  await supabase.from('bottles').update({ open_date: openDate, status: 'open' }).eq('id', id);
  revalidateBottleViews();
}

export async function updateOpenDate(id: string, openDate: string): Promise<void> {
  if (!id || !openDate) return;
  const supabase = await createClient();
  await supabase.from('bottles').update({ open_date: openDate }).eq('id', id);
  revalidateBottleViews();
}

export async function updateRemaining(id: string, pct: number): Promise<void> {
  if (!id || !Number.isFinite(pct)) return;
  const clamped = Math.max(0, Math.min(100, Math.round(pct)));
  const supabase = await createClient();
  await supabase.from('bottles').update({ remaining_pct: clamped }).eq('id', id);
  revalidateBottleViews();
}

export async function finishBottle(formData: FormData): Promise<void> {
  const id = String(formData.get('id') ?? '');
  if (!id) return;
  const supabase = await createClient();
  await supabase.from('bottles').update({ status: 'finished', remaining_pct: 0 }).eq('id', id);
  revalidateBottleViews();
}

export async function deleteBottle(formData: FormData): Promise<void> {
  const id = String(formData.get('id') ?? '');
  if (!id) return;
  const supabase = await createClient();
  await supabase.from('bottles').delete().eq('id', id);
  revalidateBottleViews();
}
