import type { Metadata } from 'next';
import { Plus_Jakarta_Sans } from 'next/font/google';
import { headers } from 'next/headers';
import './globals.css';
import { AppProviders } from './providers';

const plusJakartaSans = Plus_Jakarta_Sans({ subsets: ['latin'], display: 'swap' });

export const metadata: Metadata = {
  title: {
    default: 'Remcura V2',
    template: '%s | Remcura V2',
  },
  description: 'Inventory, ordering, and supplier management for medical practices.',
};

function extractNonceFromCSP(csp: string | null): string | null {
  if (!csp) return null;
  const match = csp.match(/nonce-([A-Za-z0-9+/=]+)/);
  return match ? match[1] : null;
}

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const headersList = await headers();
  const csp = headersList.get('content-security-policy');
  const nonce = extractNonceFromCSP(csp);

  return (
    <html lang="en" className="h-full" suppressHydrationWarning>
      <head>
        <script
          nonce={nonce || undefined}
          dangerouslySetInnerHTML={{
            __html: `
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
            `,
          }}
        />
      </head>
      <body className={`${plusJakartaSans.className} min-h-full antialiased`}>
        <AppProviders>{children}</AppProviders>
      </body>
    </html>
  );
}
