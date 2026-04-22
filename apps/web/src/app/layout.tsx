import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';

import { AppHeader } from '@/components/layouts/app-header';
import { Providers } from '@/providers';

import './globals.css';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: {
    default: 'Agendia — Portal de Agendamento de Exames',
    template: '%s · Agendia',
  },
  description:
    'Plataforma da Agendia para buscar exames laboratoriais e agendar horários com rapidez.',
};

interface RootLayoutProps {
  children: React.ReactNode;
}

export default function RootLayout({ children }: RootLayoutProps) {
  return (
    <html
      lang="pt-BR"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="bg-background text-foreground flex min-h-full flex-col">
        <Providers>
          <AppHeader />
          {children}
        </Providers>
      </body>
    </html>
  );
}
