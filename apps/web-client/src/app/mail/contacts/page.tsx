'use client';

import { useEffect, useState } from 'react';
import { contacts } from '@/lib/api';

export default function ContactsPage() {
  const [list, setList] = useState<{ id: string; payloadEncrypted: string }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    contacts.list().then((r) => setList(r.contacts)).catch(() => setList([])).finally(() => setLoading(false));
  }, []);

  return (
    <div className="p-6 max-w-2xl">
      <h2 className="text-xl font-medium mb-4">Contacts</h2>
      <p className="text-zinc-500 text-sm mb-4">
        Contacts are stored encrypted. Decrypt with your key in the client to show name/email.
      </p>
      {loading ? (
        <p className="text-zinc-500">Loading...</p>
      ) : list.length === 0 ? (
        <p className="text-zinc-500">No contacts yet.</p>
      ) : (
        <ul className="space-y-2">
          {list.map((c) => (
            <li key={c.id} className="p-3 rounded-lg bg-zinc-800/50 border border-zinc-700">
              <span className="text-sm text-zinc-400">Encrypted payload (decrypt in app)</span>
              <p className="text-xs text-zinc-600 mt-1 font-mono truncate">{c.payloadEncrypted.slice(0, 80)}...</p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
