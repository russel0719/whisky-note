import { Eyebrow } from '@/components/ui';
import { ImportWizard } from './import-wizard';

export const metadata = { title: '과거 기록 가져오기' };
// 기본 시음일(작년 1월 1일)이 빌드 시점에 굳지 않도록 요청마다 렌더링
export const dynamic = 'force-dynamic';

export default function ImportPage() {
  // 날짜 없는 과거 기록의 기본 시음일: 지난해 1월 1일
  const defaultDate = `${new Date().getFullYear() - 1}-01-01`;
  return (
    <div className="max-w-2xl">
      <header className="mb-8">
        <Eyebrow>Import</Eyebrow>
        <h1 className="font-display text-[30px]">과거 기록 가져오기</h1>
        <p className="text-sm text-muted mt-2">
          메모로 남겨 둔 점수와 구매가를 앱 기록으로 옮깁니다. 저장 전에 카탈로그 매칭과 환산 점수를
          확인할 수 있습니다.
        </p>
      </header>
      <ImportWizard defaultDate={defaultDate} />
    </div>
  );
}
