import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Последний протокол — 2D survival horror',
  description: '2D-игра о побеге из полицейского участка с зомби, управляемым правилами.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ru">
      <body>{children}</body>
    </html>
  );
}
