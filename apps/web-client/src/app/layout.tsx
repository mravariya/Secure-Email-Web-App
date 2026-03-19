import type { Metadata } from 'next';
import './globals.css';
import { ErrorBoundary } from '@/components/ErrorBoundary';

export const metadata: Metadata = {
  title: 'SecureMail — Private Encrypted Email',
  description: 'End-to-end encrypted email. Zero knowledge.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen antialiased font-sans">
        <ErrorBoundary
          fallback={
            <div className="min-h-screen flex items-center justify-center bg-[var(--bg)] text-zinc-400">
              <div className="text-center p-6">
                <p className="font-medium text-zinc-300">Something went wrong</p>
                <p className="text-sm mt-2">Try refreshing the page or check that the API server is running.</p>
              </div>
            </div>
          }
        >
          {children}
        </ErrorBoundary>
      </body>
    </html>
  );
}
