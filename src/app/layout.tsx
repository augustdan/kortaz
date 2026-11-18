import type { Metadata, Viewport } from 'next';
import { Inter, Manrope } from 'next/font/google';
import { PwaSupport } from '@/components/pwa/PwaSupport';
import './globals.css';

const inter = Inter({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-inter',
  display: 'swap',
});

const manrope = Manrope({
  subsets: ['latin'],
  weight: ['500', '600', '700', '800'],
  variable: '--font-manrope',
  display: 'swap',
});

const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://kortaz-app.vercel.app';

export const viewport: Viewport = {
  themeColor: '#090909',
  width: 'device-width',
  initialScale: 1,
};

export const metadata: Metadata = {
  metadataBase: new URL(appUrl),
  title: {
    default: 'Kortaz — Plataforma SaaS para Barbearias & Salões de Beleza',
    template: '%s | Kortaz',
  },
  description:
    'Agende, organize, fidelize e cresça com o Kortaz. Plataforma multi-tenant completa para barbearias masculinas, cabeleireiros e salões de beleza.',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Kortaz',
  },
  openGraph: {
    type: 'website',
    locale: 'pt_BR',
    url: appUrl,
    siteName: 'Kortaz',
    title: 'Kortaz — Sua barbearia ou salão no próximo nível',
    description:
      'Agenda inteligente, gestão de profissionais, comissões automáticas, controle financeiro, estoque, CRM e agendamento online.',
  },
  icons: {
    icon: [
      { url: '/assets/brand/favicon.svg', type: 'image/svg+xml' },
      { url: '/icons/icon-192x192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icons/icon-512x512.png', sizes: '512x512', type: 'image/png' },
    ],
    apple: [{ url: '/icons/apple-touch-icon.png', sizes: '180x180', type: 'image/png' }],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" className={`${inter.variable} ${manrope.variable}`}>
      <body className="min-h-screen bg-[#090909] text-[#F5F1EB] antialiased selection:bg-[#D99A4E]/30 selection:text-[#F5F1EB]">
        {children}
        <PwaSupport />
      </body>
    </html>
  );
}
