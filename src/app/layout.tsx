import type { Metadata, Viewport } from 'next';
import { Outfit } from 'next/font/google';
import './globals.css';
import PWARegister from '@/components/PWARegister';

const outfit = Outfit({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-outfit',
});

export const viewport: Viewport = {
  themeColor: '#f59e0b',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  viewportFit: 'cover',
};

export const metadata: Metadata = {
  title: 'GourmetScan - Numérisez vos recettes',
  description: "Scannez vos recettes de cuisine écrites à la main ou imprimées grâce à l'IA.",
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'GourmetScan',
  },
  icons: {
    apple: '/icons/icon-192.png',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="fr" className={`${outfit.variable} h-full antialiased`}>
      <head>
        <meta name="mobile-web-app-capable" content="yes" />
      </head>
      <body className="min-h-full flex flex-col font-sans bg-amber-50/20 text-stone-900 selection:bg-amber-200">
        <PWARegister />
        {children}
      </body>
    </html>
  );
}
