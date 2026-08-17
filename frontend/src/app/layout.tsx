import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'منصة خدمة العملاء عبر واتساب',
  description: 'WhatsApp Customer Service & AI Agent Platform',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ar" dir="rtl">
      <body className="min-h-screen bg-gray-50 font-sans text-gray-900 antialiased dark:bg-gray-950 dark:text-gray-100">
        {children}
      </body>
    </html>
  );
}
