'use client';

import { useEffect, useState, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { auth, mailboxes as mailboxApi } from '@/lib/api';
import { ErrorBoundary } from '@/components/ErrorBoundary';

const FOLDERS = [
  { id: 'inbox', label: 'Inbox' },
  { id: 'sent', label: 'Sent' },
  { id: 'drafts', label: 'Drafts' },
  { id: 'spam', label: 'Spam' },
  { id: 'trash', label: 'Trash' },
];

function Sidebar() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [user, setUser] = useState<{ email: string } | null>(null);
  const [mailboxId, setMailboxId] = useState<string | null>(null);

  useEffect(() => {
    auth.me().then(setUser).catch(() => {
      router.replace('/login');
    });
    mailboxApi.get().then((m) => setMailboxId(m.id)).catch(() => {
      setMailboxId(null);
    });
  }, [router]);

  function handleLogout() {
    const refresh = localStorage.getItem('refreshToken');
    if (refresh) auth.logout(refresh).catch(() => {});
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    router.replace('/login');
  }

  const currentFolder = pathname === '/mail' ? (searchParams.get('folder') || 'inbox') : '';

  return (
    <>
      <aside className="w-56 border-r border-[var(--border)] flex flex-col">
        <div className="p-4 border-b border-[var(--border)]">
          <Link href="/mail" className="text-lg font-semibold text-cyan-400">
            SecureMail
          </Link>
        </div>
        <nav className="flex-1 p-2 space-y-0.5">
          {FOLDERS.map((f) => (
            <Link
              key={f.id}
              href={mailboxId ? `/mail?folder=${f.id}` : '/mail'}
              className={`block px-3 py-2 rounded-lg text-sm ${
                currentFolder === f.id ? 'bg-cyan-500/20 text-cyan-400' : 'text-zinc-400 hover:bg-zinc-800'
              }`}
            >
              {f.label}
            </Link>
          ))}
          <div className="pt-4">
            <Link
              href="/mail/contacts"
              className="block px-3 py-2 rounded-lg text-sm text-zinc-400 hover:bg-zinc-800"
            >
              Contacts
            </Link>
          </div>
        </nav>
        <div className="p-3 border-t border-[var(--border)]">
          <p className="text-xs text-zinc-500 truncate" title={user?.email}>
            {user?.email}
          </p>
          <button
            type="button"
            onClick={handleLogout}
            className="mt-1 text-xs text-cyan-400 hover:underline"
          >
            Sign out
          </button>
        </div>
      </aside>
    </>
  );
}

export default function MailLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-screen bg-[var(--bg)]">
      <Suspense fallback={<aside className="w-56 border-r border-[var(--border)] flex items-center justify-center text-zinc-500 text-sm">Loading…</aside>}>
        <Sidebar />
      </Suspense>
      <main className="flex-1 flex flex-col min-w-0">
        <ErrorBoundary>
          <Suspense fallback={<div className="flex items-center justify-center p-8 text-zinc-500">Loading…</div>}>
            {children}
          </Suspense>
        </ErrorBoundary>
      </main>
    </div>
  );
}
