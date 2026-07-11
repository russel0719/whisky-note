'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { parseWhiskyFields } from '@/lib/parse';

export interface FormState {
  error?: string;
}

export async function createWhisky(_prev: FormState, formData: FormData): Promise<FormState> {
  const parsed = parseWhiskyFields(formData);
  if ('error' in parsed) return { error: parsed.error };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from('whiskies')
    .insert(parsed.fields)
    .select('id')
    .single();
  if (error) return { error: `저장에 실패했습니다: ${error.message}` };

  revalidatePath('/whiskies');
  redirect(`/whiskies/${data.id}`);
}

export async function deleteWhisky(formData: FormData): Promise<void> {
  const id = String(formData.get('id') ?? '');
  if (!id) return;
  const supabase = await createClient();
  await supabase.from('whiskies').delete().eq('id', id);
  revalidatePath('/whiskies');
  redirect('/whiskies');
}
