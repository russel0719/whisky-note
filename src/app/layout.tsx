import type { Metadata, Viewport } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: {
    default: 'Whisky Note',
    template: '%s — Whisky Note',
  },
  description: '위스키 시음과 구매 경험을 기록하는 개인 노트',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Whisky Note',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#1a1714',
  viewportFit: 'cover',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <head>
        <link
          rel="stylesheet"
          href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable-dynamic-subset.min.css"
        />
      </head>
      <body className="antialiased min-h-screen">{children}</body>
    </html>
  );
}
