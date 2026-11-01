import { createClient } from '@/lib/supabase/server';
import { EmptyState, LinkCard, PageHeader, ScoreFigure, SectionTitle } from '@/components/ui';
import { formatDate } from '@/lib/format';
import type { Flight } from '@/lib/types';
import { NewFlightForm } from './flight-forms';

export const metadata = { title: '플라이트' };

function today(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export default async function FlightsPage() {
  const supabase = await createClient();
  const [flightsRes, glassesRes] = await Promise.all([
    supabase.from('flights').select('*').order('tasted_at', { ascending: false }),
    supabase.from('tastings').select('flight_id, score, whisky_id').not('flight_id', 'is', null),
  ]);
  const flights = (flightsRes.data ?? []) as Flight[];
  const glasses = (glassesRes.data ?? []) as {
    flight_id: string;
    score: number | null;
    whisky_id: string | null;
  }[];

  return (
    <div className="space-y-10">
      <PageHeader eyebrow="Flights" title="플라이트" />
      <p className="text-sm text-muted -mt-4">
        한 자리에서 여러 잔을 나란히 마시고 비교합니다. 블라인드로 기록하고 나중에 공개할 수도
        있습니다.
      </p>

      <section className="max-w-lg">
        <SectionTitle>새 플라이트</SectionTitle>
        <NewFlightForm today={today()} />
      </section>

      <section>
        <SectionTitle>기록 {flights.length > 0 && `(${flights.length})`}</SectionTitle>
        {flights.length === 0 ? (
          <EmptyState message="아직 플라이트가 없습니다." />
        ) : (
          <div className="space-y-3">
            {flights.map((flight) => {
              const mine = glasses.filter((g) => g.flight_id === flight.id);
              const best = Math.max(...mine.map((g) => g.score ?? -1));
              const hidden = mine.filter((g) => g.whisky_id == null).length;
              return (
                <LinkCard
                  key={flight.id}
                  href={`/flights/${flight.id}`}
                  className="flex items-center justify-between gap-4"
                >
                  <div className="min-w-0">
                    <p className="font-semibold truncate">{flight.name}</p>
                    <p className="text-sm text-muted mt-0.5">
                      {[
                        formatDate(flight.tasted_at),
                        `${mine.length}잔`,
                        flight.blind
                          ? hidden > 0
                            ? `블라인드 · ${hidden}잔 공개 전`
                            : '블라인드 · 공개됨'
                          : null,
                        flight.location,
                      ]
                        .filter(Boolean)
                        .join(' · ')}
                    </p>
                  </div>
                  <ScoreFigure value={best >= 0 ? best : null} />
                </LinkCard>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
