import Link from 'next/link';
import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { Card, CategoryBadge } from '@/components/ui';
import { averageScore, formatDate, formatKrw, formatOpenAge } from '@/lib/format';
import { BUY_AGAIN_LABELS, type TastingFull } from '@/lib/types';
import { deleteTasting } from '../actions';

function NoteBlock({
  label,
  score,
  note,
}: {
  label: string;
  score: number | null;
  note: string | null;
}) {
  if (score == null && !note) return null;
  return (
    <Card>
      <div className="flex items-center justify-between">
        <p className="text-sm text-faint tracking-[0.15em] uppercase">{label}</p>
        {score != null && (
          <p className="text-[22px] font-semibold text-accent-bright tabular-nums">{score}</p>
        )}
      </div>
      {note && <p className="mt-2 leading-relaxed">{note}</p>}
    </Card>
  );
}

export default async function TastingDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const { data } = await supabase
    .from('tastings')
    .select('*, whiskies(*), bottles(*), tasting_aromas(aroma_tags(*))')
    .eq('id', id)
    .maybeSingle();

  const tasting = data as TastingFull | null;
  if (!tasting) notFound();

  const overall =
    tasting.overall_score ??
    averageScore(tasting.nose_score, tasting.palate_score, tasting.finish_score);
  const openAge = tasting.bottles
    ? formatOpenAge(tasting.bottles.open_date, tasting.tasted_at)
    : null;
  const aromas = tasting.tasting_aromas.map((row) => row.aroma_tags).filter(Boolean);

  return (
    <div className="space-y-8">
      <header>
        <p className="text-accent text-sm tracking-[0.25em] uppercase mb-2">
          {formatDate(tasting.tasted_at)}
        </p>
        <div className="flex items-start justify-between gap-4">
          <Link href={`/whiskies/${tasting.whisky_id}`} className="hover:text-accent-bright">
            <h1 className="text-[28px] leading-tight">{tasting.whiskies.name}</h1>
          </Link>
          <div className="text-right shrink-0">
            <p className="text-[40px] font-semibold text-accent-bright tabular-nums leading-none">
              {overall ?? '—'}
            </p>
            <p className="text-xs text-faint mt-1">
              {tasting.overall_score != null ? '총점' : 'N/P/F 평균'}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2 mt-3 text-sm text-muted">
          <CategoryBadge category={tasting.whiskies.category} />
          {tasting.location && <span>{tasting.location}</span>}
          {openAge ? (
            <span className="text-accent-bright">{openAge}에 시음</span>
          ) : (
            tasting.bottle_id == null && <span>바 · 모임 시음</span>
          )}
          {tasting.price_paid != null && <span>잔 {formatKrw(tasting.price_paid)}</span>}
        </div>
      </header>

      <section className="space-y-3">
        <NoteBlock label="Nose" score={tasting.nose_score} note={tasting.nose_note} />
        <NoteBlock label="Palate" score={tasting.palate_score} note={tasting.palate_note} />
        <NoteBlock label="Finish" score={tasting.finish_score} note={tasting.finish_note} />
      </section>

      {aromas.length > 0 && (
        <section>
          <p className="text-sm text-faint mb-3">아로마</p>
          <div className="flex flex-wrap gap-2">
            {aromas.map((tag) => (
              <span
                key={tag.id}
                className="inline-flex items-center h-8 px-3 rounded-full border border-accent/40 text-sm text-accent-bright"
              >
                {tag.name}
              </span>
            ))}
          </div>
        </section>
      )}

      {(tasting.comment || tasting.pairing || tasting.would_buy_again) && (
        <section className="space-y-3">
          {tasting.comment && (
            <Card>
              <p className="text-sm text-faint mb-2">총평</p>
              <p className="leading-relaxed">{tasting.comment}</p>
            </Card>
          )}
          <div className="flex flex-wrap gap-2 text-sm">
            {tasting.pairing && (
              <span className="inline-flex items-center h-8 px-3 rounded-full border border-hairline text-muted">
                페어링 · {tasting.pairing}
              </span>
            )}
            {tasting.would_buy_again && (
              <span className="inline-flex items-center h-8 px-3 rounded-full border border-hairline text-muted">
                재구매 · {BUY_AGAIN_LABELS[tasting.would_buy_again]}
              </span>
            )}
          </div>
        </section>
      )}

      <form action={deleteTasting} className="pt-4 border-t border-hairline-soft">
        <input type="hidden" name="id" value={tasting.id} />
        <button type="submit" className="text-danger text-sm">
          이 노트 삭제
        </button>
      </form>
    </div>
  );
}
