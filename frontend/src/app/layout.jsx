import './globals.css';

export const metadata = {
  title: 'Hotel Laxmi Elite — Hotel + Restaurant + POS',
  description: 'Hotel Laxmi Elite — luxury rooms, Aadhya multi-cuisine restaurant, rooftop pool, and seamless online booking.',
  icons: {
    icon: '/favicon.svg',
    apple: '/favicon.svg',
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
        <link rel="apple-touch-icon" href="/favicon.svg" />
      </head>
      <body>{children}</body>
    </html>
  );
}