import type { createClient } from '@/lib/supabase/server';
import { parseWhiskyFields } from '@/lib/parse';

type Supabase = Awaited<ReturnType<typeof createClient>>;

/** WhiskyPicker가 whisky_id 필드에 넣는 특수값 */
export const PICK_CATALOG = '__catalog__';
export const PICK_MANUAL = '__manual__';
/** 즉석 직접 입력 필드의 name 접두사 (WhiskyFields prefix) */
export const MANUAL_PREFIX = 'new_';

/**
 * 폼의 위스키 선택을 내 위스키 id로 바꾼다.
 * 내 위스키 id는 그대로, 카탈로그 항목은 ensure_whisky_from_catalog()로 등록/재사용,
 * 직접 입력은 new_* 필드로 새 위스키를 만든다.
 */
export async function resolveWhiskyId(
  supabase: Supabase,
  formData: FormData
): Promise<{ id: string } | { error: string }> {
  const whiskyId = String(formData.get('whisky_id') ?? '');
  if (!whiskyId) return { error: '위스키를 선택해주세요.' };

  if (whiskyId === PICK_CATALOG) {
    const catalogId = String(formData.get('catalog_id') ?? '');
    if (!catalogId) return { error: '카탈로그에서 위스키를 선택해주세요.' };
    const { data, error } = await supabase.rpc('ensure_whisky_from_catalog', {
      p_catalog_id: catalogId,
    });
    if (error || !data) return { error: `위스키 등록에 실패했습니다: ${error?.message ?? ''}` };
    return { id: data as string };
  }

  if (whiskyId === PICK_MANUAL) {
    const parsed = parseWhiskyFields(formData, MANUAL_PREFIX);
    if ('error' in parsed) return { error: parsed.error ?? '위스키 정보를 확인해주세요.' };
    const { data, error } = await supabase
      .from('whiskies')
      .insert(parsed.fields)
      .select('id')
      .single();
    if (error) return { error: `위스키 등록에 실패했습니다: ${error.message}` };
    return { id: data.id };
  }

  if (whiskyId.startsWith('__')) return { error: '잘못된 요청입니다.' };
  return { id: whiskyId };
}
