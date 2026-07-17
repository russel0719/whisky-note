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

export async function deleteWhisky(formData: FormData): Promise<void> {
  const id = String(formData.get('id') ?? '');
  if (!id) return;
  const supabase = await createClient();
  await supabase.from('whiskies').delete().eq('id', id);
  revalidatePath('/whiskies');
  redirect('/whiskies');
}
