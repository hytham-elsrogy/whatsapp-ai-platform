import type { Metadata } from 'next';
import { ThemeProvider } from 'next-themes';
import { Toaster } from 'react-hot-toast';
import './globals.css';

export const metadata: Metadata = {
  title: 'WhatsApp CRM - نظام إدارة محادثات WhatsApp',
  description: 'نظام إدارة محادثات WhatsApp للمؤسسات',
  icons: { icon: '/favicon.ico' },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ar" dir="rtl" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      </head>
      <body>
        <ThemeProvider attribute="class" defaultTheme="light" enableSystem>
          {children}
          <Toaster
            position="top-center"
            toastOptions={{
              duration: 3000,
              style: {
                background: '#1f2c33',
                color: '#e9edef',
                fontFamily: 'Cairo, sans-serif',
                direction: 'rtl',
              },
            }}
          />
        </ThemeProvider>
      </body>
    </html>
  );
}
