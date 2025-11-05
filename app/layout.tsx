import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { AppProviders } from './providers';

const inter = Inter({ subsets: ['latin'], display: 'swap' });

export const metadata: Metadata = {
  title: {
    default: 'Remcura V2',
    template: '%s | Remcura V2',
  },
  description: 'Inventory, ordering, and supplier management for medical practices.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="h-full" suppressHydrationWarning>
      <body className={`${inter.className} min-h-full antialiased`}>
        <AppProviders>{children}</AppProviders>
      </body>
    </html>
  );
}
