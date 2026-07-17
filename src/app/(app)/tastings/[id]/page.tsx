import Link from 'next/link';
import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { Card, CategoryBadge, Eyebrow, scoreTextClass } from '@/components/ui';
import { ColorDot } from '@/components/color-swatch';
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
          <p className={`font-display text-[24px] tabular-nums ${scoreTextClass(score)}`}>
            {score}
          </p>
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
        <Eyebrow>{formatDate(tasting.tasted_at)}</Eyebrow>
        <div className="flex items-start justify-between gap-4">
          <Link href={`/whiskies/${tasting.whisky_id}`} className="hover:text-accent-bright">
            <h1 className="font-display text-[30px] leading-tight">{tasting.whiskies.name}</h1>
          </Link>
          <div className="text-right shrink-0">
            <p
              className={`font-display text-[44px] tabular-nums leading-none ${scoreTextClass(overall)}`}
            >
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
          <ColorDot colorKey={tasting.color} />
        </div>
      </header>

      {tasting.photo_url && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={tasting.photo_url}
          alt={`${tasting.whiskies.name} 시음 사진`}
          className="w-full max-h-80 object-cover rounded-(--radius-card) border border-hairline"
        />
      )}

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

      <div className="flex items-center justify-between pt-4 border-t border-hairline-soft">
        <div className="flex gap-3">
          <Link
            href={`/tastings/${tasting.id}/edit`}
            className="h-9 px-4 inline-flex items-center rounded-full border border-hairline text-muted text-sm"
          >
            수정
          </Link>
          <Link
            href={`/tastings/new?whisky=${tasting.whisky_id}`}
            className="h-9 px-4 inline-flex items-center rounded-full border border-accent text-accent-bright text-sm"
          >
            이 위스키 다시 기록
          </Link>
        </div>
        <form action={deleteTasting}>
          <input type="hidden" name="id" value={tasting.id} />
          <button type="submit" className="text-danger text-sm">
            삭제
          </button>
        </form>
      </div>
    </div>
  );
}
