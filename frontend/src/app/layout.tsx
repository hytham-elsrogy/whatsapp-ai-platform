import type { Metadata } from 'next';
import { Cairo } from 'next/font/google';
import './globals.css';

// Self-hosted at build time (no runtime request to Google Fonts, no
// flash-of-unstyled-text) — tailwind.config.js's fontFamily.sans pointed at
// "Cairo" for a while with nothing actually loading it, silently falling
// back to system fonts app-wide.
const cairo = Cairo({
  subsets: ['arabic', 'latin'],
  weight: ['400', '500', '600', '700', '800'],
  variable: '--font-cairo',
});

export const metadata: Metadata = {
  title: 'منصة خدمة العملاء عبر واتساب',
  description: 'WhatsApp Customer Service & AI Agent Platform',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ar" dir="rtl" className={cairo.variable}>
      <body className="min-h-screen bg-gray-50 font-sans text-gray-900 antialiased dark:bg-gray-950 dark:text-gray-100">
        {children}
      </body>
    </html>
  );
}
