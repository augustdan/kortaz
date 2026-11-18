import type { Metadata } from 'next';
import { Inter, Manrope } from 'next/font/google';
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

export const metadata: Metadata = {
  metadataBase: new URL(appUrl),
  title: {
    default: 'Kortaz — Plataforma SaaS para Barbearias & Salões de Beleza',
    template: '%s | Kortaz',
  },
  description:
    'Agende, organize, fidelize e cresça com o Kortaz. Plataforma multi-tenant completa para barbearias masculinas, cabeleireiros e salões de beleza.',
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
    icon: '/assets/brand/favicon.svg',
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
      </body>
    </html>
  );
}
