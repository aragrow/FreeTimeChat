import { Geist, Geist_Mono } from 'next/font/google';
import type { Metadata } from 'next';
import { ClientLayout } from '@/components/ClientLayout';
import { AuthProvider } from '@/contexts/AuthContext';
import { NavigationProvider } from '@/contexts/NavigationContext';
import { TranslationProvider } from '@/contexts/TranslationContext';
import './globals.css';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: 'AfricAI Digital Books - Smart Business Management',
  description:
    'Manage your business with AI-powered tools. Track expenses, time, projects, and clients with intelligent automation.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <TranslationProvider>
          <AuthProvider>
            <NavigationProvider>
              <ClientLayout>{children}</ClientLayout>
            </NavigationProvider>
          </AuthProvider>
        </TranslationProvider>
      </body>
    </html>
  );
}
