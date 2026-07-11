import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Whisky Note',
    short_name: 'Whisky Note',
    description: '위스키 시음과 구매 경험을 기록하는 개인 노트',
    start_url: '/',
    display: 'standalone',
    background_color: '#1a1714',
    theme_color: '#1a1714',
    icons: [
      { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
      { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
      {
        src: '/icons/icon-maskable-512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
    ],
  };
}
