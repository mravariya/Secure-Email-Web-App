'use client';

import { useEffect, useState, useCallback } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { mailboxes, emails, type EmailListItem } from '@/lib/api';

function MailboxContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const folder = searchParams.get('folder') || 'inbox';
  const [mailboxId, setMailboxId] = useState<string | null>(null);
  const [list, setList] = useState<EmailListItem[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<{
    body: string;
    from: string;
    to: string | null;
    subject: string | null;
    attachments: { id: string; filenameEncrypted: string; sizeBytes: number }[];
  } | null>(null);
  const [loading, setLoading] = useState(true);

  const loadMailbox = useCallback(async () => {
    try {
      const m = await mailboxes.get();
      setMailboxId(m.id);
      const { emails: list } = await mailboxes.getEmails(m.id, folder);
      setList(list);
    } catch {
      setList([]);
    } finally {
      setLoading(false);
    }
  }, [folder]);

  useEffect(() => {
    loadMailbox();
  }, [loadMailbox]);

  useEffect(() => {
    if (!selectedId) {
      setDetail(null);
      return;
    }
    emails.get(selectedId).then((e) => {
      setDetail({
        body: e.bodyEncrypted || '(encrypted — decrypt in app)',
        from: e.fromAddress,
        to: e.toAddresses,
        subject: e.subjectPlain || e.subjectEncrypted,
        attachments: e.attachments || [],
      });
    }).catch(() => setDetail(null));
  }, [selectedId]);

  const subject = (e: EmailListItem) =>
    e.subjectPlain || e.subjectEncrypted || '(No subject)';

  return (
    <div className="flex flex-1 min-h-0">
      <div className="w-96 border-r border-[var(--border)] flex flex-col">
        <div className="p-3 border-b border-[var(--border)] flex items-center gap-2">
          <h2 className="font-medium capitalize">{folder}</h2>
          <button
            type="button"
            onClick={() => router.push('/mail/compose')}
            className="ml-auto btn-primary text-sm"
          >
            Compose
          </button>
        </div>
        <div className="flex-1 overflow-auto">
          {loading ? (
            <p className="p-4 text-zinc-500">Loading...</p>
          ) : list.length === 0 ? (
            <p className="p-4 text-zinc-500">No emails</p>
          ) : (
            <ul>
              {list.map((e) => (
                <li
                  key={e.id}
                  role="button"
                  tabIndex={0}
                  onClick={() => setSelectedId(e.id)}
                  onKeyDown={(ev) => ev.key === 'Enter' && setSelectedId(e.id)}
                  className={`px-4 py-3 border-b border-zinc-800/50 cursor-pointer hover:bg-zinc-800/50 ${
                    selectedId === e.id ? 'bg-cyan-500/10 border-l-2 border-l-cyan-500' : ''
                  } ${!e.isRead ? 'font-medium' : 'text-zinc-400'}`}
                >
                  <p className="truncate text-sm">{subject(e)}</p>
                  <p className="truncate text-xs text-zinc-500 mt-0.5">
                    {e.fromAddress}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
      <div className="flex-1 flex flex-col min-w-0 p-4 overflow-auto">
        {detail ? (
          <>
            <div className="mb-4">
              <h3 className="text-lg font-medium">{detail.subject}</h3>
              <p className="text-sm text-zinc-500">
                From: {detail.from} {detail.to && `To: ${detail.to}`}
              </p>
            </div>
            <div className="prose prose-invert prose-sm max-w-none whitespace-pre-wrap break-words">
              {detail.body.startsWith('<') ? (
                <div dangerouslySetInnerHTML={{ __html: detail.body }} />
              ) : (
                detail.body.split('\n').map((line, i) => <p key={i}>{line}</p>)
              )}
            </div>
            {detail.attachments.length > 0 && (
              <div className="mt-4 pt-4 border-t border-zinc-700">
                <p className="text-sm text-zinc-500 mb-2">Attachments</p>
                <ul className="space-y-1">
                  {detail.attachments.map((a) => (
                    <li key={a.id}>
                      <a
                        href={`/api/proxy/v1/attachments/${a.id}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-cyan-400 hover:underline text-sm"
                      >
                        {a.filenameEncrypted || 'Attachment'} ({Math.round(a.sizeBytes / 1024)} KB)
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </>
        ) : (
          <p className="text-zinc-500">Select an email</p>
        )}
      </div>
    </div>
  );
}

export default function MailboxPage() {
  return <MailboxContent />;
}
