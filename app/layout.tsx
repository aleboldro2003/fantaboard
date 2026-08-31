import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
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
  title: 'FantaBoard · Guida Asta Serie A 2026/27',
  description:
    'Listone Serie A 2026/27 con ruoli, quotazioni, FVM, statistiche, budget e gerarchie sui calci piazzati.',
  openGraph: {
    title: 'FantaBoard · Guida Asta Serie A 2026/27',
    description:
      'Listone, statistiche, budget, alternative e gerarchie sui calci piazzati.',
    type: 'website',
    locale: 'it_IT',
    images: [{ url: '/og.png', width: 1200, height: 630, alt: 'FantaBoard · Guida asta Serie A 2026/27' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'FantaBoard · Guida Asta Serie A 2026/27',
    description:
      'Listone, statistiche, budget, alternative e gerarchie sui calci piazzati.',
    images: ['/og.png'],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="it">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
