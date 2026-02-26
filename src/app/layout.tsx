
import type {Metadata} from 'next';
import './globals.css';
import { LanguageProvider } from '@/lib/i18n/context';
import { FirebaseClientProvider } from '@/firebase/client-provider';
import { ThemeProvider } from '@/components/theme-provider';
import { Toaster } from '@/components/ui/toaster';
import { ChatAssistant } from '@/components/ai/chat-assistant';

export const metadata: Metadata = {
  title: 'ombor.uz - Professional Ombor Boshqaruvi',
  description: 'AI-powered inventory and warehouse management system. Professional ombor boshqaruvi tizimi.',
  metadataBase: new URL('https://ombor.uz'),
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Space+Grotesk:wght@400;500;600;700&family=Source+Code+Pro:wght@400;500&display=swap" rel="stylesheet" />
      </head>
      <body className="font-body antialiased">
        <ThemeProvider defaultTheme="system" storageKey="omborchi-theme">
          <FirebaseClientProvider>
            <LanguageProvider>
              {children}
              <ChatAssistant />
              <Toaster />
            </LanguageProvider>
          </FirebaseClientProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
