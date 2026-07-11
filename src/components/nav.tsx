'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const TABS = [
  {
    href: '/',
    label: '홈',
    icon: (
      <path d="M3 10.5 12 3l9 7.5V21a1 1 0 0 1-1 1h-5v-7h-6v7H4a1 1 0 0 1-1-1v-10.5Z" />
    ),
  },
  {
    href: '/whiskies',
    label: '위스키',
    icon: (
      <path d="M9 2h6v5c0 2-1 3-1 5s1 3 1 5v3a2 2 0 0 1-2 2h-2a2 2 0 0 1-2-2v-3c0-2 1-3 1-5s-1-3-1-5V2Zm0 5h6" />
    ),
  },
  {
    href: '/bottles',
    label: '보틀',
    icon: (
      <path d="M10 2h4v4l2 3v11a2 2 0 0 1-2 2h-4a2 2 0 0 1-2-2V9l2-3V2Zm-2 11h8" />
    ),
  },
  {
    href: '/tastings',
    label: '노트',
    icon: (
      <path d="M5 3h11l3 3v15a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1Zm3 7h8M8 14h8M8 18h5" />
    ),
  },
];

function isActive(pathname: string, href: string) {
  return href === '/' ? pathname === '/' : pathname.startsWith(href);
}

export function DesktopNavLinks() {
  const pathname = usePathname();
  return (
    <div className="hidden md:flex items-center gap-6">
      {TABS.map((tab) => (
        <Link
          key={tab.href}
          href={tab.href}
          className={`text-sm ${
            isActive(pathname, tab.href) ? 'text-accent-bright' : 'text-muted hover:text-ink'
          }`}
        >
          {tab.label}
        </Link>
      ))}
    </div>
  );
}

export function MobileTabBar() {
  const pathname = usePathname();
  return (
    <nav className="md:hidden fixed bottom-0 inset-x-0 z-20 bg-nav/80 backdrop-blur-xl border-t border-hairline-soft pb-[env(safe-area-inset-bottom)]">
      <div className="grid grid-cols-4 h-16">
        {TABS.map((tab) => {
          const active = isActive(pathname, tab.href);
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={`flex flex-col items-center justify-center gap-1 text-[11px] ${
                active ? 'text-accent-bright' : 'text-muted'
              }`}
            >
              <svg
                viewBox="0 0 24 24"
                className="w-6 h-6"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                {tab.icon}
              </svg>
              {tab.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
