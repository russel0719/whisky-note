const krw = new Intl.NumberFormat('ko-KR');

export function formatKrw(value: number | null | undefined): string {
  if (value == null) return '—';
  return `₩${krw.format(value)}`;
}

export function formatDate(iso: string | null | undefined): string {
  if (!iso) return '—';
  const d = new Date(`${iso.slice(0, 10)}T00:00:00`);
  return `${d.getFullYear()}. ${d.getMonth() + 1}. ${d.getDate()}.`;
}

/** 개봉일 기준 경과를 "개봉 N일차/N개월차" 형태로 표현. 기준일(at)이 없으면 오늘 기준. */
export function daysSinceOpen(openDate: string | null, at?: string | null): number | null {
  if (!openDate) return null;
  const from = new Date(`${openDate.slice(0, 10)}T00:00:00`);
  const to = at ? new Date(`${at.slice(0, 10)}T00:00:00`) : new Date();
  const days = Math.floor((to.getTime() - from.getTime()) / 86_400_000);
  return days < 0 ? null : days;
}

export function formatOpenAge(openDate: string | null, at?: string | null): string | null {
  const days = daysSinceOpen(openDate, at);
  if (days == null) return null;
  if (days === 0) return '개봉 당일';
  if (days < 31) return `개봉 ${days}일차`;
  const months = Math.floor(days / 30.44);
  if (months < 12) return `개봉 ${months}개월차`;
  const years = Math.floor(months / 12);
  const rest = months % 12;
  return rest === 0 ? `개봉 ${years}년차` : `개봉 ${years}년 ${rest}개월차`;
}

/** N/P/F 점수의 평균 (입력된 값만으로 계산, 모두 없으면 null) */
export function averageScore(
  ...scores: (number | null | undefined)[]
): number | null {
  const nums = scores.filter((s): s is number => s != null);
  if (nums.length === 0) return null;
  return Math.round(nums.reduce((a, b) => a + b, 0) / nums.length);
}
