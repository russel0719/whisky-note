import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import type { Whisky } from '@/lib/types';
import { WhiskyEditForm } from './whisky-edit-form';

export const metadata = { title: '위스키 수정' };

export default async function EditWhiskyPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const { data } = await supabase.from('whiskies').select('*').eq('id', id).maybeSingle();
  const whisky = data as Whisky | null;
  if (!whisky) notFound();

  return <WhiskyEditForm whisky={whisky} />;
}
