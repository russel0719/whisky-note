import Link from 'next/link';
import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { ScoreDial } from '@/components/charts';
import { Card, CategoryBadge, Eyebrow, scoreTextClass } from '@/components/ui';
import { ColorDot } from '@/components/color-swatch';
import { averageScore, formatDate, formatKrw, formatOpenAge } from '@/lib/format';
import {
  BUY_AGAIN_LABELS,
  FINISH_CHARACTERS,
  FINISH_LENGTHS,
  NOSE_INTENSITIES,
  PALATE_BODIES,
  PALATE_SWEETNESS,
  PALATE_TEXTURES,
  SERVES,
  type AromaStage,
  type AromaTag,
  type TastingFull,
} from '@/lib/types';
import { ConfirmForm } from '@/components/confirm-form';
import { deleteTasting } from '../actions';
import { ShareCardButton } from './share-button';

function Chip({ children, accent }: { children: React.ReactNode; accent?: boolean }) {
  return (
    <span
      className={`inline-flex items-center h-8 px-3 rounded-full border text-sm ${
        accent ? 'border-accent/40 text-accent-bright' : 'border-hairline text-muted'
      }`}
    >
      {children}
    </span>
  );
}

function NoteBlock({
  label,
  score,
  descriptors,
  aromas,
  note,
}: {
  label: string;
  score: number | null;
  descriptors: string[];
  aromas: AromaTag[];
  note: string | null;
}) {
  if (score == null && descriptors.length === 0 && aromas.length === 0 && !note) return null;
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
      {(descriptors.length > 0 || aromas.length > 0) && (
        <div className="flex flex-wrap gap-2 mt-3">
          {descriptors.map((d) => (
            <Chip key={d}>{d}</Chip>
          ))}
          {aromas.map((tag) => (
            <Chip key={tag.id} accent>
              {tag.name}
            </Chip>
          ))}
        </div>
      )}
      {note && <p className="mt-3 leading-relaxed break-words text-muted">{note}</p>}
    </Card>
  );
}

export default async function TastingDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data } = await supabase
    .from('tastings')
    .select('*, whiskies(*), bottles(*), tasting_aromas(stage, aroma_tags(*))')
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
  const aromasOf = (stage: AromaStage) =>
    tasting.tasting_aromas
      .filter((row) => row.stage === stage)
      .map((row) => row.aroma_tags)
      .filter(Boolean);
  const aromas = aromasOf('overall');
  const whisky = tasting.whiskies;
  const title = whisky?.name ?? `블라인드 ${tasting.flight_position ?? ''}번 잔`;

  return (
    <div className="space-y-8">
      <header>
        <Eyebrow>{formatDate(tasting.tasted_at)}</Eyebrow>
        <div className="flex items-start justify-between gap-4">
          {whisky ? (
            <Link href={`/whiskies/${whisky.id}`} className="hover:text-accent-bright min-w-0">
              <h1 className="font-display text-[30px] leading-tight">{title}</h1>
            </Link>
          ) : (
            <div className="min-w-0">
              <h1 className="font-display text-[30px] leading-tight">{title}</h1>
              <p className="text-sm text-muted mt-1">
                공개 전{tasting.blind_guess ? ` · 추측: ${tasting.blind_guess}` : ''}
              </p>
            </div>
          )}
          <div className="shrink-0">
            <ScoreDial
              value={overall}
              size={104}
              label={tasting.overall_score != null ? '총점' : 'N/P/F 평균'}
            />
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2 mt-3 text-sm text-muted">
          {whisky && <CategoryBadge category={whisky.category} />}
          {tasting.flight_id && (
            <Link href={`/flights/${tasting.flight_id}`} className="text-accent-bright">
              플라이트 {tasting.flight_position}번 잔
            </Link>
          )}
          {whisky && tasting.blind_guess && <span>블라인드 추측: {tasting.blind_guess}</span>}
          {tasting.source_score != null && <span>가져온 기록 (원점수 {tasting.source_score})</span>}
          {tasting.serve && <span>{SERVES[tasting.serve]}</span>}
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
          alt={`${title} 시음 사진`}
          className="w-full max-h-80 object-cover rounded-(--radius-card) border border-hairline"
        />
      )}

      <section className="space-y-3">
        <NoteBlock
          label="Nose"
          score={tasting.nose_score}
          descriptors={
            tasting.nose_intensity ? [`강도 ${NOSE_INTENSITIES[tasting.nose_intensity]}`] : []
          }
          aromas={aromasOf('nose')}
          note={tasting.nose_note}
        />
        <NoteBlock
          label="Palate"
          score={tasting.palate_score}
          descriptors={[
            ...(tasting.palate_body ? [`${PALATE_BODIES[tasting.palate_body]} 바디`] : []),
            ...(tasting.palate_sweetness
              ? [`맛 ${PALATE_SWEETNESS[tasting.palate_sweetness]}`]
              : []),
            ...tasting.palate_texture.map((k) => PALATE_TEXTURES[k]),
          ]}
          aromas={aromasOf('palate')}
          note={tasting.palate_note}
        />
        <NoteBlock
          label="Finish"
          score={tasting.finish_score}
          descriptors={[
            ...(tasting.finish_length ? [`여운 ${FINISH_LENGTHS[tasting.finish_length]}`] : []),
            ...tasting.finish_character.map((k) => FINISH_CHARACTERS[k]),
          ]}
          aromas={aromasOf('finish')}
          note={tasting.finish_note}
        />
      </section>

      {aromas.length > 0 && (
        <section>
          <p className="text-sm text-faint mb-3">아로마 (단계 미지정)</p>
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
              <p className="leading-relaxed break-words">{tasting.comment}</p>
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

      <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-hairline-soft">
        <div className="flex flex-wrap gap-3">
          <Link
            href={`/tastings/${tasting.id}/edit`}
            className="h-9 px-4 inline-flex items-center rounded-full border border-hairline text-muted text-sm"
          >
            수정
          </Link>
          {whisky && (
            <Link
              href={`/tastings/new?whisky=${whisky.id}`}
              className="h-9 px-4 inline-flex items-center rounded-full border border-accent text-accent-bright text-sm"
            >
              이 위스키 다시 기록
            </Link>
          )}
          {tasting.flight_id && (
            <Link
              href={`/flights/${tasting.flight_id}`}
              className="h-9 px-4 inline-flex items-center rounded-full border border-hairline text-muted text-sm"
            >
              플라이트로
            </Link>
          )}
          <ShareCardButton
            tastingId={tasting.id}
            fileName={`${title} ${tasting.tasted_at.slice(0, 10)}`}
          />
        </div>
        <ConfirmForm action={deleteTasting} message="이 시음 노트를 삭제할까요?">
          <input type="hidden" name="id" value={tasting.id} />
          <button type="submit" className="text-danger text-sm">
            삭제
          </button>
        </ConfirmForm>
      </div>
    </div>
  );
}
