import type { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://kortaz-app.vercel.app';
  return {
    rules: [
      {
        userAgent: '*',
        allow: ['/', '/precos', '/s/', '/agendar/', '/termos', '/privacidade'],
        disallow: ['/app/', '/admin/', '/api/'],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
