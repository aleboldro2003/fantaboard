import type { Metadata, Viewport } from 'next';
import { Archivo, JetBrains_Mono } from 'next/font/google';
import './globals.css';

// Archivo variabile: l'asse wdth ci dà il taglio "Expanded" dei titoli
// senza caricare una seconda famiglia.
const archivo = Archivo({
  variable: '--font-archivo',
  subsets: ['latin'],
  axes: ['wdth'],
});

const jetbrainsMono = JetBrains_Mono({
  variable: '--font-jetbrains',
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

export const viewport: Viewport = {
  themeColor: '#070a09',
  viewportFit: 'cover',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    // Le variabili dei font stanno su <html>: è lì che `font-sans` le legge.
    <html lang="it" className={`${archivo.variable} ${jetbrainsMono.variable}`}>
      <body className="antialiased">{children}</body>
    </html>
  );
}
