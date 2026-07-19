'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { parseOptionalNumber, parseOptionalText } from '@/lib/parse';
import { HEX_COLOR_RE, WHISKY_COLORS } from '@/lib/types';

export interface FormState {
  error?: string;
}

function parseScore(value: FormDataEntryValue | null): number | null | 'invalid' {
  const n = parseOptionalNumber(value);
  if (n == null) return null;
  if (n < 0 || n > 100) return 'invalid';
  return Math.round(n);
}

function parseTastingFields(formData: FormData) {
  const scores = {
    nose_score: parseScore(formData.get('nose_score')),
    palate_score: parseScore(formData.get('palate_score')),
    finish_score: parseScore(formData.get('finish_score')),
    overall_score: parseScore(formData.get('overall_score')),
  };
  if (Object.values(scores).includes('invalid')) {
    return { error: '점수는 0에서 100 사이여야 합니다.' as const };
  }

  const tastedAt = String(formData.get('tasted_at') ?? '').trim();
  if (!tastedAt) return { error: '시음일을 입력해주세요.' as const };

  const buyAgain = String(formData.get('would_buy_again') ?? '');
  const color = String(formData.get('color') ?? '');

  return {
    fields: {
      bottle_id: parseOptionalText(formData.get('bottle_id')),
      tasted_at: tastedAt,
      location: parseOptionalText(formData.get('location')),
      ...(scores as Record<string, number | null>),
      nose_note: parseOptionalText(formData.get('nose_note')),
      palate_note: parseOptionalText(formData.get('palate_note')),
      finish_note: parseOptionalText(formData.get('finish_note')),
      comment: parseOptionalText(formData.get('comment')),
      pairing: parseOptionalText(formData.get('pairing')),
      would_buy_again: ['yes', 'no', 'maybe'].includes(buyAgain) ? buyAgain : null,
      price_paid: parseOptionalNumber(formData.get('price_paid')),
      color:
        HEX_COLOR_RE.test(color) || WHISKY_COLORS.some((c) => c.key === color) ? color : null,
      photo_url: parseOptionalText(formData.get('photo_url')),
    },
    tagIds: formData
      .getAll('aroma_tags')
      .map((v) => Number(v))
      .filter((n) => Number.isInteger(n)),
  };
}

export async function createTasting(_prev: FormState, formData: FormData): Promise<FormState> {
  const supabase = await createClient();

  let whiskyId = String(formData.get('whisky_id') ?? '');
  if (!whiskyId) return { error: '위스키를 선택해주세요.' };

  // "카탈로그에서 찾기" 선택 시 — 카탈로그 항목을 내 위스키로 등록(이미 있으면 재사용)
  if (whiskyId === '__catalog__') {
    const catalogId = String(formData.get('catalog_id') ?? '');
    if (!catalogId) return { error: '카탈로그에서 위스키를 선택해주세요.' };
    const { data: entry } = await supabase
      .from('catalog')
      .select('*')
      .eq('id', catalogId)
      .maybeSingle();
    if (!entry) return { error: '카탈로그 항목을 찾지 못했습니다.' };

    const { data: existing } = await supabase
      .from('whiskies')
      .select('id')
      .ilike('name', entry.name)
      .maybeSingle();
    if (existing) {
      whiskyId = existing.id;
    } else {
      const { data, error } = await supabase
        .from('whiskies')
        .insert({
          name: entry.name,
          distillery: entry.distillery,
          category: entry.category,
          region: entry.region,
          abv: entry.abv,
          age_years: entry.age_years,
          cask_type: entry.cask_type,
        })
        .select('id')
        .single();
      if (error) return { error: `위스키 등록에 실패했습니다: ${error.message}` };
      whiskyId = data.id;
    }
  }

  const parsed = parseTastingFields(formData);
  if ('error' in parsed) return { error: parsed.error };

  const { data: tasting, error } = await supabase
    .from('tastings')
    .insert({ whisky_id: whiskyId, ...parsed.fields })
    .select('id')
    .single();
  if (error) return { error: `저장에 실패했습니다: ${error.message}` };

  if (parsed.tagIds.length > 0) {
    const { error: tagError } = await supabase
      .from('tasting_aromas')
      .insert(parsed.tagIds.map((tagId) => ({ tasting_id: tasting.id, tag_id: tagId })));
    if (tagError) return { error: `아로마 태그 저장에 실패했습니다: ${tagError.message}` };
  }

  revalidatePath('/');
  revalidatePath('/tastings');
  redirect(`/tastings/${tasting.id}`);
}

export async function updateTasting(_prev: FormState, formData: FormData): Promise<FormState> {
  const id = String(formData.get('id') ?? '');
  const whiskyId = String(formData.get('whisky_id') ?? '');
  if (!id || !whiskyId || whiskyId.startsWith('__')) return { error: '잘못된 요청입니다.' };

  const parsed = parseTastingFields(formData);
  if ('error' in parsed) return { error: parsed.error };

  const supabase = await createClient();
  const { error } = await supabase
    .from('tastings')
    .update({ whisky_id: whiskyId, ...parsed.fields })
    .eq('id', id);
  if (error) return { error: `저장에 실패했습니다: ${error.message}` };

  // 아로마 태그는 전체 교체
  await supabase.from('tasting_aromas').delete().eq('tasting_id', id);
  if (parsed.tagIds.length > 0) {
    const { error: tagError } = await supabase
      .from('tasting_aromas')
      .insert(parsed.tagIds.map((tagId) => ({ tasting_id: id, tag_id: tagId })));
    if (tagError) return { error: `아로마 태그 저장에 실패했습니다: ${tagError.message}` };
  }

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
