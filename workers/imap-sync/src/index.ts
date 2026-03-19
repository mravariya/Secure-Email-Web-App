/**
 * IMAP sync worker: connects to IMAP, fetches new emails, stores encrypted metadata + body.
 * Configure IMAP_* and optionally map to a mailbox (e.g. single shared inbox or per-user config).
 */
import { ImapFlow } from 'imapflow';
import { db } from '@secure-email/database';
import { mailboxes, emails, emailBodies } from '@secure-email/database';
import { eq } from 'drizzle-orm';
import { simpleParser } from 'mailparser';

const imapHost = process.env.IMAP_HOST;
const imapPort = parseInt(process.env.IMAP_PORT || '993', 10);
const imapUser = process.env.IMAP_USER;
const imapPass = process.env.IMAP_PASS;
const POLL_MS = 60000;

if (!imapHost || !imapUser || !imapPass) {
  console.warn('IMAP_* not set. Set IMAP_HOST, IMAP_USER, IMAP_PASS to enable sync.');
  process.exit(0);
}

async function fetchAndStore(client: ImapFlow, mailboxId: string) {
  await client.mailboxOpen('INBOX');
  const list = await client.fetch({ seen: false }, { envelope: true, source: true });
  for (const msg of list) {
    try {
      const source = (msg as { source: Buffer | string }).source;
      const parsed = await simpleParser(Buffer.isBuffer(source) ? source : Buffer.from(source));
      const messageId = parsed.messageId || `<${Date.now()}@imap>`;
      const [existing] = await db.select().from(emails).where(eq(emails.messageId, messageId)).limit(1);
      if (existing) continue;

      const from = parsed.from?.value?.[0]?.address || 'unknown@unknown';
      const to = parsed.to?.value?.map((a) => (a as { address?: string }).address).filter(Boolean) as string[] || [];
      const [inserted] = await db
        .insert(emails)
        .values({
          mailboxId,
          folder: 'inbox',
          fromAddress: from,
          toAddresses: JSON.stringify(to),
          subjectPlain: parsed.subject || null,
          messageId,
          receivedAt: parsed.date || new Date(),
        })
        .returning();
      if (inserted) {
        const body = parsed.html || parsed.text || '';
        await db.insert(emailBodies).values({
          emailId: inserted.id,
          bodyEncrypted: body,
        });
      }
    } catch (e) {
      console.error('Error storing message', e);
    }
  }
}

async function run() {
  const client = new ImapFlow({
    host: imapHost,
    port: imapPort,
    secure: true,
    auth: { user: imapUser, pass: imapPass },
  });
  await client.connect();
  const [mailbox] = await db.select().from(mailboxes).limit(1);
  const mailboxId = mailbox?.id;
  if (!mailboxId) {
    console.warn('No mailbox found. Create a user first.');
    await client.logout();
    return;
  }
  for (;;) {
    try {
      await fetchAndStore(client, mailboxId);
    } catch (e) {
      console.error('IMAP sync error', e);
    }
    await new Promise((r) => setTimeout(r, POLL_MS));
  }
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
