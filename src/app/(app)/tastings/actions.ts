'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { parseTastingFields } from '@/lib/parse';

export interface FormState {
  error?: string;
}

export async function createTasting(_prev: FormState, formData: FormData): Promise<FormState> {
  const supabase = await createClient();

  let whiskyId = String(formData.get('whisky_id') ?? '');
  if (!whiskyId) return { error: '위스키를 선택해주세요.' };

  const parsed = parseTastingFields(formData);
  if ('error' in parsed) return { error: parsed.error };

  // "카탈로그에서 찾기" 선택 시 — 카탈로그 항목을 내 위스키로 등록(이미 있으면 재사용)
  if (whiskyId === '__catalog__') {
    const catalogId = String(formData.get('catalog_id') ?? '');
    if (!catalogId) return { error: '카탈로그에서 위스키를 선택해주세요.' };
    const { data, error } = await supabase.rpc('ensure_whisky_from_catalog', {
      p_catalog_id: catalogId,
    });
    if (error || !data) return { error: `위스키 등록에 실패했습니다: ${error?.message ?? ''}` };
    whiskyId = data as string;
  }

  const { data: tastingId, error } = await supabase.rpc('save_tasting', {
    p_tasting: { whisky_id: whiskyId, ...parsed.fields },
    p_aromas: parsed.aromas,
  });
  if (error || !tastingId) return { error: `저장에 실패했습니다: ${error?.message ?? ''}` };

  revalidatePath('/');
  revalidatePath('/tastings');
  redirect(`/tastings/${tastingId}`);
}

export async function updateTasting(_prev: FormState, formData: FormData): Promise<FormState> {
  const id = String(formData.get('id') ?? '');
  const whiskyId = String(formData.get('whisky_id') ?? '');
  if (!id || !whiskyId || whiskyId.startsWith('__')) return { error: '잘못된 요청입니다.' };

  const parsed = parseTastingFields(formData);
  if ('error' in parsed) return { error: parsed.error };

  // 노트와 아로마 태그(전체 교체)를 한 트랜잭션으로 저장
  const supabase = await createClient();
  const { error } = await supabase.rpc('save_tasting', {
    p_tasting: { whisky_id: whiskyId, ...parsed.fields },
    p_aromas: parsed.aromas,
    p_id: id,
  });
  if (error) return { error: `저장에 실패했습니다: ${error.message}` };

  revalidatePath('/');
  revalidatePath('/tastings');
  revalidatePath(`/tastings/${id}`);
  redirect(`/tastings/${id}`);
}

export async function deleteTasting(formData: FormData): Promise<void> {
  const id = String(formData.get('id') ?? '');
  if (!id) return;
  const supabase = await createClient();
  await supabase.from('tastings').delete().eq('id', id);
  revalidatePath('/');
  revalidatePath('/tastings');
  redirect('/tastings');
}
