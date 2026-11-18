import type { Metadata } from 'next';
import { Cormorant_Garamond, Plus_Jakarta_Sans } from 'next/font/google';
import './globals.css';

const cormorant = Cormorant_Garamond({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-cormorant',
});

const jakarta = Plus_Jakarta_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-jakarta',
});

export const metadata: Metadata = {
  title: 'Kortaz OS — Plataforma Inteligente para Barbearias & Salões de Beleza',
  description:
    'Sistema completo multi-tenant para barbearias masculinas, cabeleireiros e salões femininos: agenda inteligente, Pix, comissões, CRM, estoque e multiunidades.',
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
    <html lang="pt-BR" className={`${cormorant.variable} ${jakarta.variable}`}>
      <body className="min-h-screen bg-[#0E0906] text-[#F7EFE6] selection:bg-[#D49B6A]/30 selection:text-[#F7EFE6]">
        {children}
      </body>
    </html>
  );
}
