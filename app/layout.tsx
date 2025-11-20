import type { Metadata } from 'next';
import { Plus_Jakarta_Sans } from 'next/font/google';
import './globals.css';
import { AppProviders } from './providers';

const plusJakartaSans = Plus_Jakarta_Sans({ subsets: ['latin'], display: 'swap' });

export const metadata: Metadata = {
  title: {
    default: 'Venzory',
    template: '%s | Venzory',
  },
  description: 'Inventory, ordering, and supplier management for medical practices.',
};

// Theme script - prevents FOUC by applying theme before React hydrates
// This script is allowed by CSP hash (see lib/csp.ts)
const themeScript = `
(function() {
  const storageKey = 'theme';
  const theme = localStorage.getItem(storageKey);
  const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  const effectiveTheme = theme === 'system' ? systemTheme : (theme || 'dark');
  
  if (effectiveTheme === 'dark') {
    document.documentElement.classList.add('dark');
  } else {
    document.documentElement.classList.remove('dark');
  }
})();
`;

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="h-full" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className={`${plusJakartaSans.className} min-h-full antialiased`}>
        <AppProviders>{children}</AppProviders>
      </body>
    </html>
  );
}
