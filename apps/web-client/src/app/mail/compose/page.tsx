'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { emails } from '@/lib/api';

export default function ComposePage() {
  const router = useRouter();
  const [to, setTo] = useState('');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setSending(true);
    try {
      const toList = to.split(/[\s,]+/).filter(Boolean);
      await emails.create({
        to: toList,
        subject,
        bodyEncrypted: body,
        sendNow: true,
      });
      router.push('/mail?folder=inbox');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Send failed');
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="flex flex-col h-full">
      <div className="p-3 border-b border-[var(--border)]">
        <h2 className="font-medium">New message</h2>
      </div>
      <form onSubmit={handleSend} className="flex flex-col flex-1 min-h-0 p-4">
        <div className="space-y-3 mb-4">
          <div>
            <label className="block text-sm text-zinc-500 mb-1">To</label>
            <input
              type="text"
              className="input"
              placeholder="recipient@example.com"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              required
            />
          </div>
          <div>
            <label className="block text-sm text-zinc-500 mb-1">Subject</label>
            <input
              type="text"
              className="input"
              placeholder="Subject"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
            />
          </div>
        </div>
        <div className="flex-1 min-h-0 flex flex-col">
          <label className="block text-sm text-zinc-500 mb-1">Message</label>
          <textarea
            className="input flex-1 min-h-[200px] resize-y"
            placeholder="Write your message (plain text for now; E2E encryption uses bodyEncrypted + session keys)"
            value={body}
            onChange={(e) => setBody(e.target.value)}
          />
        </div>
        {error && <p className="text-red-400 text-sm mt-2">{error}</p>}
        <div className="flex gap-2 mt-4">
          <button type="submit" className="btn-primary" disabled={sending}>
            {sending ? 'Sending...' : 'Send'}
          </button>
          <button
            type="button"
            className="btn-secondary"
            onClick={() => router.back()}
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
