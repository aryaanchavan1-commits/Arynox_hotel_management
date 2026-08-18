import './globals.css';
import { headers } from 'next/headers';

export const metadata = {
  title: 'Lakshmi Elite — Hotel · Restaurant · Events',
  description: 'Lakshmi Elite — exquisite rooms, multi-cuisine dining, online food ordering, venue halls for functions, and seamless online booking with real-time availability.',
  keywords: 'hotel booking, restaurant, online order, venue hall, Lakshmi Elite, hotel management',
  openGraph: {
    title: 'Lakshmi Elite — Hotel · Restaurant · Events',
    description: 'Book rooms, order food online, reserve tables and venue halls — all in one place.',
    type: 'website',
  },
  icons: {
    icon: '/favicon.svg',
    apple: '/favicon.svg',
  },
};

export default function RootLayout({ children }) {
  headers();
  const siteMode = process.env.SITE_MODE || 'erp';
  return (
    <html lang="en">
      <head>
        <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
        <link rel="apple-touch-icon" href="/favicon.svg" />
        <meta name="site-mode" content={siteMode} />
      </head>
      <body>{children}</body>
    </html>
  );
}