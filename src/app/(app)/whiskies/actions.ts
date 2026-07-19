'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { parseOptionalText, parseWhiskyFields } from '@/lib/parse';

export interface FormState {
  error?: string;
}

export async function createWhisky(_prev: FormState, formData: FormData): Promise<FormState> {
  const parsed = parseWhiskyFields(formData);
  if ('error' in parsed) return { error: parsed.error };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from('whiskies')
    .insert({ ...parsed.fields, image_url: parseOptionalText(formData.get('image_url')) })
    .select('id')
    .single();
  if (error) return { error: `저장에 실패했습니다: ${error.message}` };

  revalidatePath('/whiskies');
  redirect(`/whiskies/${data.id}`);
}

export async function updateWhisky(_prev: FormState, formData: FormData): Promise<FormState> {
  const id = String(formData.get('id') ?? '');
  if (!id) return { error: '잘못된 요청입니다.' };

  const parsed = parseWhiskyFields(formData);
  if ('error' in parsed) return { error: parsed.error };

  const supabase = await createClient();
  const { error } = await supabase
    .from('whiskies')
    .update({ ...parsed.fields, image_url: parseOptionalText(formData.get('image_url')) })
    .eq('id', id);
  if (error) return { error: `저장에 실패했습니다: ${error.message}` };

  revalidatePath('/whiskies');
  revalidatePath(`/whiskies/${id}`);
  redirect(`/whiskies/${id}`);
}

/** 카탈로그 항목으로 내 위스키 생성. 같은 이름이 이미 있으면 그 상세로 이동. */
export async function addWhiskyFromCatalog(formData: FormData): Promise<void> {
  const catalogId = String(formData.get('catalog_id') ?? '');
  if (!catalogId) return;

  const supabase = await createClient();
  const { data: entry } = await supabase
    .from('catalog')
    .select('*')
    .eq('id', catalogId)
    .maybeSingle();
  if (!entry) return;

  // 한글 표기를 기본 이름으로 사용
  const displayName = entry.name_ko ?? entry.name;

  const { data: existing } = await supabase
    .from('whiskies')
    .select('id')
    .ilike('name', displayName)
    .maybeSingle();
  if (existing) redirect(`/whiskies/${existing.id}`);

  const { data: created, error } = await supabase
    .from('whiskies')
    .insert({
      name: displayName,
      distillery: entry.distillery,
      category: entry.category,
      region: entry.region,
      abv: entry.abv,
      age_years: entry.age_years,
      cask_type: entry.cask_type,
    })
    .select('id')
    .single();
  if (error || !created) return;

  revalidatePath('/whiskies');
  redirect(`/whiskies/${created.id}`);
}

export async function deleteWhisky(formData: FormData): Promise<void> {
  const id = String(formData.get('id') ?? '');
  if (!id) return;
  const supabase = await createClient();
  await supabase.from('whiskies').delete().eq('id', id);
  revalidatePath('/whiskies');
  redirect('/whiskies');
}
