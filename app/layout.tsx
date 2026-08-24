import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  metadataBase: new URL('https://zombi-stalker.bobegoha.chatgpt.site'),
  title: 'Последний протокол — 2D survival horror',
  description: '2D-игра о побеге из полицейского участка с зомби, управляемым правилами.',
  openGraph: {
    title: 'Последний протокол — 2D survival horror',
    description: 'Найдите три улики, отвлеките зомби шумом и выберитесь из полицейского участка.',
    images: ['/og.png'],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Последний протокол — 2D survival horror',
    description: 'Найдите три улики, отвлеките зомби шумом и выберитесь из участка.',
    images: ['/og.png'],
  },
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
