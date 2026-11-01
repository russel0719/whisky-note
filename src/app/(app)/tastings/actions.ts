'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { parseTastingFields } from '@/lib/parse';
import { resolveWhiskyId } from '@/lib/whisky-resolve';

export interface FormState {
  error?: string;
}

/** 블라인드 플라이트의 잔이면 위스키 없이(공개 전) 저장할 수 있다 */
async function isBlindFlight(
  supabase: Awaited<ReturnType<typeof createClient>>,
  flightId: string | null
): Promise<boolean> {
  if (!flightId) return false;
  const { data } = await supabase.from('flights').select('blind').eq('id', flightId).maybeSingle();
  return data?.blind === true;
}

export async function createTasting(_prev: FormState, formData: FormData): Promise<FormState> {
  const supabase = await createClient();

  const parsed = parseTastingFields(formData);
  if ('error' in parsed) return { error: parsed.error };
  const flightId = parsed.fields.flight_id;

  let whiskyId: string | null = null;
  if (formData.get('whisky_id')) {
    // 카탈로그 항목·직접 입력이면 여기서 내 위스키로 등록(카탈로그는 이미 있으면 재사용)
    const whisky = await resolveWhiskyId(supabase, formData);
    if ('error' in whisky) return { error: whisky.error };
    whiskyId = whisky.id;
  } else if (!(await isBlindFlight(supabase, flightId))) {
    return { error: '위스키를 선택해주세요.' };
  }

  const { data: tastingId, error } = await supabase.rpc('save_tasting', {
    p_tasting: { whisky_id: whiskyId, ...parsed.fields },
    p_aromas: parsed.aromas,
  });
  if (error || !tastingId) return { error: `저장에 실패했습니다: ${error?.message ?? ''}` };

  revalidatePath('/');
  revalidatePath('/tastings');
  revalidatePath('/bottles');
  revalidatePath('/whiskies');
  if (flightId) {
    revalidatePath(`/flights/${flightId}`);
    redirect(`/flights/${flightId}`);
  }
  redirect(`/tastings/${tastingId}`);
}

export async function updateTasting(_prev: FormState, formData: FormData): Promise<FormState> {
  const id = String(formData.get('id') ?? '');
  const whiskyId = String(formData.get('whisky_id') ?? '');
  if (!id || whiskyId.startsWith('__')) return { error: '잘못된 요청입니다.' };

  const parsed = parseTastingFields(formData);
  if ('error' in parsed) return { error: parsed.error };

  const supabase = await createClient();
  if (!whiskyId && !(await isBlindFlight(supabase, parsed.fields.flight_id))) {
    return { error: '위스키를 선택해주세요.' };
  }

  // 노트와 아로마 태그(전체 교체)를 한 트랜잭션으로 저장
  const { error } = await supabase.rpc('save_tasting', {
    p_tasting: { whisky_id: whiskyId || null, ...parsed.fields },
    p_aromas: parsed.aromas,
    p_id: id,
  });
  if (error) return { error: `저장에 실패했습니다: ${error.message}` };

  revalidatePath('/');
  revalidatePath('/tastings');
  revalidatePath('/bottles');
  revalidatePath(`/tastings/${id}`);
  if (parsed.fields.flight_id) revalidatePath(`/flights/${parsed.fields.flight_id}`);
  redirect(`/tastings/${id}`);
}

export async function deleteTasting(formData: FormData): Promise<void> {
  const id = String(formData.get('id') ?? '');
  if (!id) return;
  const supabase = await createClient();
  const { data } = await supabase.from('tastings').delete().eq('id', id).select('flight_id');
  revalidatePath('/');
  revalidatePath('/tastings');
  const flightId = data?.[0]?.flight_id;
  if (flightId) {
    revalidatePath(`/flights/${flightId}`);
    redirect(`/flights/${flightId}`);
  }
  redirect('/tastings');
}
