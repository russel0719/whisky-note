'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { parseOptionalText } from '@/lib/parse';

function revalidateWishlistViews(whiskyId?: string | null) {
  revalidatePath('/wishlist');
  revalidatePath('/stats');
  if (whiskyId) revalidatePath(`/whiskies/${whiskyId}`);
}

/** 카탈로그 항목을 위시리스트에 추가 (이미 있으면 그대로) */
export async function addWishlistFromCatalog(formData: FormData): Promise<void> {
  const catalogId = String(formData.get('catalog_id') ?? '');
  if (!catalogId) return;
  const supabase = await createClient();
  const { data: entry } = await supabase
    .from('catalog')
    .select('name, name_ko')
    .eq('id', catalogId)
    .maybeSingle();
  if (!entry) return;
  await supabase
    .from('wishlist')
    .upsert(
      { catalog_id: catalogId, name: entry.name_ko ?? entry.name },
      { onConflict: 'user_id,catalog_id', ignoreDuplicates: true }
    );
  revalidateWishlistViews();
}

/** 내 위스키(바에서 마셔본 것 등)를 위시리스트에 추가 */
export async function addWishlistFromWhisky(formData: FormData): Promise<void> {
  const whiskyId = String(formData.get('whisky_id') ?? '');
  if (!whiskyId) return;
  const supabase = await createClient();
  const { data: whisky } = await supabase
    .from('whiskies')
    .select('name, catalog_id')
    .eq('id', whiskyId)
    .maybeSingle();
  if (!whisky) return;
  await supabase
    .from('wishlist')
    .upsert(
      { whisky_id: whiskyId, catalog_id: whisky.catalog_id, name: whisky.name },
      { onConflict: 'user_id,whisky_id', ignoreDuplicates: true }
    );
  revalidateWishlistViews(whiskyId);
}

/** 카탈로그에 없는 위스키를 이름만으로 추가 */
export async function addWishlistManual(formData: FormData): Promise<void> {
  const name = parseOptionalText(formData.get('name'));
  if (!name) return;
  const supabase = await createClient();
  await supabase.from('wishlist').insert({ name, note: parseOptionalText(formData.get('note')) });
  revalidateWishlistViews();
}

export async function removeWishlist(formData: FormData): Promise<void> {
  const id = String(formData.get('id') ?? '');
  if (!id) return;
  const supabase = await createClient();
  const { data } = await supabase.from('wishlist').delete().eq('id', id).select('whisky_id');
  revalidateWishlistViews(data?.[0]?.whisky_id);
}
