// 라우트 전환마다 리마운트되어 페이지 진입 모션을 재적용한다.
export default function Template({ children }: { children: React.ReactNode }) {
  return <div className="page-in">{children}</div>;
}
