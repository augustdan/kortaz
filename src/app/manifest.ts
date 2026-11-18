import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Kortaz — Barbearias & Salões',
    short_name: 'Kortaz',
    description:
      'Agendamento online e plataforma completa de gestão para barbearias e salões de beleza.',
    start_url: '/',
    display: 'standalone',
    background_color: '#090909',
    theme_color: '#090909',
    orientation: 'portrait-primary',
    lang: 'pt-BR',
    categories: ['business', 'lifestyle', 'productivity'],
    icons: [
      {
        src: '/icons/icon-192x192.png',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/icons/icon-512x512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/icons/icon-512x512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
    ],
  };
}
