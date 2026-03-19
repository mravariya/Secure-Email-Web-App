'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function Home() {
  const router = useRouter();
  useEffect(() => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;
    if (token) router.replace('/mail');
    else router.replace('/login');
  }, [router]);
  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--bg)]">
      <div className="animate-pulse text-zinc-500">Loading...</div>
    </div>
  );
}
