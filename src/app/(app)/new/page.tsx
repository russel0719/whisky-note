import Link from 'next/link';
import { Eyebrow } from '@/components/ui';

export const metadata = { title: '기록 추가' };

const OPTIONS = [
  {
    href: '/tastings/new',
    title: '시음 노트',
    description: '오늘 마신 한 잔의 향과 맛, 여운을 기록합니다.',
  },
  {
    href: '/bottles/new',
    title: '구매 기록',
    description: '새로 들인 보틀의 구매 정보와 개봉 상태를 기록합니다.',
  },
] as const;

export default function NewRecordPage() {
  return (
    <div>
      <header className="mb-8">
        <Eyebrow>New</Eyebrow>
        <h1 className="font-display text-[30px]">어떤 기록인가요?</h1>
      </header>
      <div className="grid gap-4 md:grid-cols-2">
        {OPTIONS.map((option) => (
          <Link
            key={option.href}
            href={option.href}
            className="block bg-tile-1 border border-hairline rounded-(--radius-card) p-6 hover:border-accent/50"
          >
            <p className="text-[21px] font-semibold">{option.title}</p>
            <p className="text-muted text-sm mt-2 leading-relaxed">{option.description}</p>
            <p className="text-accent-bright text-sm mt-4">기록하기 →</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
