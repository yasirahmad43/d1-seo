import './globals.css';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'D1 SEO Dashboard',
  description: 'Multi-tenant SEO performance & changelog dashboard for D1 Tech Creative.'
};

// Force every route to render dynamically — they all use cookies/auth.
export const dynamic = 'force-dynamic';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en"><body>{children}</body></html>
  );
}
