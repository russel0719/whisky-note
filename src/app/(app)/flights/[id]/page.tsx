import Link from 'next/link';
import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { ConfirmForm } from '@/components/confirm-form';
import { Card, Eyebrow, scoreTextClass, SectionTitle } from '@/components/ui';
import type { PickerWhisky } from '@/components/whisky-picker';
import { formatDate } from '@/lib/format';
import {
  FINISH_CHARACTERS,
  FINISH_LENGTHS,
  NOSE_INTENSITIES,
  PALATE_BODIES,
  PALATE_SWEETNESS,
  PALATE_TEXTURES,
  type AromaStage,
  type Flight,
  type Tasting,
  type Whisky,
} from '@/lib/types';
import { deleteFlight } from '../actions';
import { RevealForm } from '../flight-forms';

type Glass = Tasting & {
  whiskies: Pick<Whisky, 'id' | 'name'> | null;
  tasting_aromas: { stage: AromaStage; aroma_tags: { name: string } | null }[];
};

/** 비교표의 행 — 잔마다 값 하나 */
const ROWS: { label: string; value: (g: Glass) => string | number | null }[] = [
  { label: 'Nose', value: (g) => g.nose_score },
  { label: 'Palate', value: (g) => g.palate_score },
  { label: 'Finish', value: (g) => g.finish_score },
  {
    label: '향 강도',
    value: (g) => (g.nose_intensity ? NOSE_INTENSITIES[g.nose_intensity] : null),
  },
  { label: '바디', value: (g) => (g.palate_body ? PALATE_BODIES[g.palate_body] : null) },
  {
    label: '단맛',
    value: (g) => (g.palate_sweetness ? PALATE_SWEETNESS[g.palate_sweetness] : null),
  },
  {
    label: '질감',
    value: (g) => g.palate_texture.map((k) => PALATE_TEXTURES[k]).join(', ') || null,
  },
  { label: '여운', value: (g) => (g.finish_length ? FINISH_LENGTHS[g.finish_length] : null) },
  {
    label: '여운 특징',
    value: (g) => g.finish_character.map((k) => FINISH_CHARACTERS[k]).join(', ') || null,
  },
  {
    label: '아로마',
    value: (g) =>
      [...new Set(g.tasting_aromas.flatMap((a) => a.aroma_tags?.name ?? []))].join(', ') || null,
  },
  { label: '총평', value: (g) => g.comment },
];

export default async function FlightDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  const [flightRes, glassesRes, whiskiesRes] = await Promise.all([
    supabase.from('flights').select('*').eq('id', id).maybeSingle(),
    supabase
      .from('tastings')
      .select('*, whiskies(id, name), tasting_aromas(stage, aroma_tags(name))')
      .eq('flight_id', id)
      .order('flight_position', { ascending: true }),
    supabase.from('whiskies').select('id, name, catalog_id').order('name'),
  ]);
  const flight = flightRes.data as Flight | null;
  if (!flight) notFound();
  const glasses = (glassesRes.data ?? []) as Glass[];
  const whiskies = (whiskiesRes.data ?? []) as PickerWhisky[];

  const scored = glasses.filter((g) => g.score != null);
  const bestScore = scored.length > 0 ? Math.max(...scored.map((g) => g.score!)) : null;
  const hidden = glasses.filter((g) => g.whisky_id == null);
  const glassLabel = (g: Glass) => `${g.flight_position ?? '?'}번 잔`;

  return (
    <div className="space-y-10">
      <header>
        <Eyebrow>
          Flight · {formatDate(flight.tasted_at)}
          {flight.blind ? ' · Blind' : ''}
        </Eyebrow>
        <h1 className="font-display text-[30px] leading-tight">{flight.name}</h1>
        <p className="text-sm text-muted mt-2">
          {[flight.location, `${glasses.length}잔`].filter(Boolean).join(' · ')}
        </p>
        {flight.note && <p className="mt-3 text-muted">{flight.note}</p>}
      </header>

      <div className="flex flex-wrap gap-3">
        <Link
          href={`/tastings/new?flight=${flight.id}`}
          className="h-10 px-5 inline-flex items-center rounded-full bg-accent text-on-accent text-sm font-semibold"
        >
          + {glasses.length + 1}번 잔 기록
        </Link>
      </div>

      {glasses.length === 0 ? (
        <p className="text-muted text-sm">첫 잔을 기록해보세요.</p>
      ) : (
        <section>
          <SectionTitle>비교</SectionTitle>
          <div className="overflow-x-auto -mx-4 px-4 md:mx-0 md:px-0">
            <table className="w-full min-w-max border-separate border-spacing-0 text-sm">
              <thead>
                <tr>
                  <th className="sticky left-0 bg-canvas text-left font-normal text-faint pr-3 pb-3" />
                  {glasses.map((g) => (
                    <th
                      key={g.id}
                      className="text-left font-normal align-bottom px-3 pb-3 min-w-36 max-w-48"
                    >
                      <Link href={`/tastings/${g.id}`} className="block hover:text-accent-bright">
                        <span className="block text-xs text-faint">{glassLabel(g)}</span>
                        <span className="block font-semibold">{g.whiskies?.name ?? '공개 전'}</span>
                      </Link>
                      {g.blind_guess && (
                        <span className="block text-xs text-muted mt-0.5">
                          추측: {g.blind_guess}
                        </span>
                      )}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="sticky left-0 bg-canvas text-faint pr-3 py-2 border-t border-hairline-soft">
                    점수
                  </td>
                  {glasses.map((g) => (
                    <td key={g.id} className="px-3 py-2 border-t border-hairline-soft">
                      <span
                        className={`font-display text-[24px] tabular-nums ${scoreTextClass(g.score)}`}
                      >
                        {g.score ?? '—'}
                      </span>
                      {bestScore != null && g.score === bestScore && scored.length > 1 && (
                        <span className="ml-2 text-xs text-accent-bright">최고</span>
                      )}
                    </td>
                  ))}
                </tr>
                {ROWS.map((row) =>
                  glasses.some((g) => row.value(g) != null) ? (
                    <tr key={row.label}>
                      <td className="sticky left-0 bg-canvas text-faint pr-3 py-2 border-t border-hairline-soft align-top">
                        {row.label}
                      </td>
                      {glasses.map((g) => (
                        <td
                          key={g.id}
                          className="px-3 py-2 border-t border-hairline-soft align-top max-w-48 break-words"
                        >
                          {row.value(g) ?? <span className="text-faint">—</span>}
                        </td>
                      ))}
                    </tr>
                  ) : null
                )}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {hidden.length > 0 && (
        <section>
          <SectionTitle>공개</SectionTitle>
          <p className="text-sm text-muted -mt-2 mb-4">
            다 마셨다면 각 잔이 어떤 위스키였는지 연결하세요. 공개한 잔부터 목록과 통계에
            반영됩니다.
          </p>
          <div className="grid gap-3 md:grid-cols-2">
            {hidden.map((g) => (
              <Card key={g.id} className="!p-4 space-y-3">
                <p className="text-sm">
                  <span className="font-semibold">{glassLabel(g)}</span>
                  {g.score != null && <span className="text-muted"> · {g.score}점</span>}
                  {g.blind_guess && <span className="text-muted"> · 추측: {g.blind_guess}</span>}
                </p>
                <RevealForm tastingId={g.id} flightId={flight.id} whiskies={whiskies} />
              </Card>
            ))}
          </div>
        </section>
      )}

      <ConfirmForm
        action={deleteFlight}
        message={`'${flight.name}'와 이 플라이트의 잔 ${glasses.length}개(시음 노트)를 모두 삭제할까요?`}
        className="pt-4 border-t border-hairline-soft"
      >
        <input type="hidden" name="id" value={flight.id} />
        <button type="submit" className="text-danger text-sm">
          이 플라이트와 잔 기록 삭제
        </button>
      </ConfirmForm>
    </div>
  );
}
