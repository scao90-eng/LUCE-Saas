import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Luce · gestionale e social per operatori olistici',
  description: 'Gestionale, clienti, analisi social, co-conduzione e contenuti per il mondo olistico',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="it">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=DM+Sans:opsz,wght@9..40,400;9..40,500;9..40,600;9..40,700&family=Fraunces:opsz,wght@9..144,500;9..144,600&display=swap"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
