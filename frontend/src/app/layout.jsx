import './globals.css';
import { headers } from 'next/headers';

export const metadata = {
  title: 'Hotel Laxmi Elite — Hotel + Restaurant + POS',
  description: 'Hotel Laxmi Elite — luxury rooms, Aadhya multi-cuisine restaurant, rooftop pool, and seamless online booking.',
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