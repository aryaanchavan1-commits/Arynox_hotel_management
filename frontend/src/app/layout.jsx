import './globals.css';

export const metadata = {
  title: 'Arynox_Hotel_ERP',
  description: 'Hotel + Restaurant + POS + AI assistant',
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <link rel="icon" type="image/svg+xml" href="/logo.svg" />
      </head>
      <body>{children}</body>
    </html>
  );
}