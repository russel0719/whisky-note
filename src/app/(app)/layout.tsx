import Link from 'next/link';
import { DesktopNavLinks, MobileTabBar } from '@/components/nav';
import { signOut } from '@/app/login/actions';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <header className="sticky top-0 z-20 bg-nav/90 backdrop-blur-xl border-b border-hairline-soft">
        <div className="max-w-3xl mx-auto px-5 h-14 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <svg viewBox="0 0 24 24" className="w-5 h-5 text-accent" fill="currentColor">
              <path d="M7 2h10l-1.2 9.6a4.3 4.3 0 0 1-2.3 3.3V20h2.5a1 1 0 1 1 0 2h-8a1 1 0 1 1 0-2h2.5v-5.1a4.3 4.3 0 0 1-2.3-3.3L7 2Zm2.2 2 .4 3h4.8l.4-3H9.2Z" />
            </svg>
            <span className="font-semibold tracking-tight">Whisky Note</span>
          </Link>
          <div className="flex items-center gap-5">
            <DesktopNavLinks />
            <Link
              href="/new"
              className="h-9 px-4 inline-flex items-center rounded-full bg-accent text-on-accent text-sm font-semibold"
            >
              + 기록
            </Link>
            <form action={signOut}>
              <button type="submit" className="text-faint text-sm hover:text-muted">
                로그아웃
              </button>
            </form>
          </div>
        </div>
      </header>
      <main className="max-w-3xl mx-auto px-5 py-8 pb-28 md:pb-12">{children}</main>
      <MobileTabBar />
    </>
  );
}
