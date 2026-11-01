'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { parseOptionalText } from '@/lib/parse';
import { resolveWhiskyId } from '@/lib/whisky-resolve';

export interface FormState {
  error?: string;
}

export async function createFlight(_prev: FormState, formData: FormData): Promise<FormState> {
  const name = parseOptionalText(formData.get('name'));
  const tastedAt = String(formData.get('tasted_at') ?? '').trim();
  if (!name) return { error: '플라이트 이름을 입력해주세요.' };
  if (!tastedAt) return { error: '날짜를 입력해주세요.' };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from('flights')
    .insert({
      name,
      tasted_at: tastedAt,
      location: parseOptionalText(formData.get('location')),
      blind: formData.get('blind') === 'on',
      note: parseOptionalText(formData.get('note')),
    })
    .select('id')
    .single();
  if (error) return { error: `저장에 실패했습니다: ${error.message}` };

  revalidatePath('/flights');
  redirect(`/flights/${data.id}`);
}

/** 플라이트와 그 잔(시음 노트) 전부 삭제 */
export async function deleteFlight(formData: FormData): Promise<void> {
  const id = String(formData.get('id') ?? '');
  if (!id) return;
  const supabase = await createClient();
  await supabase.from('flights').delete().eq('id', id);
  revalidatePath('/flights');
  revalidatePath('/tastings');
  revalidatePath('/');
  redirect('/flights');
}

/** 블라인드 잔 공개 — 어떤 위스키였는지 연결 (카탈로그·직접 입력이면 내 위스키로 등록) */
export async function revealGlass(_prev: FormState, formData: FormData): Promise<FormState> {
  const tastingId = String(formData.get('tasting_id') ?? '');
  const flightId = String(formData.get('flight_id') ?? '');
  if (!tastingId || !flightId) return { error: '잘못된 요청입니다.' };

  const supabase = await createClient();
  const whisky = await resolveWhiskyId(supabase, formData);
  if ('error' in whisky) return { error: whisky.error };

  const { error } = await supabase
    .from('tastings')
    .update({ whisky_id: whisky.id })
    .eq('id', tastingId)
    .eq('flight_id', flightId);
  if (error) return { error: `공개에 실패했습니다: ${error.message}` };

  revalidatePath(`/flights/${flightId}`);
  revalidatePath('/tastings');
  revalidatePath('/');
  return {};
}
