/**
 * SMTP sending worker: processes outbound_queue and sends via SMTP.
 * Run when SMTP_* env vars are set (SendGrid, SES, Mailgun, or self-hosted).
 */
import { db } from '@secure-email/database';
import { emails, emailBodies, outboundQueue } from '@secure-email/database';
import { eq, and } from 'drizzle-orm';
import nodemailer from 'nodemailer';

const POLL_MS = 5000;
const smtpHost = process.env.SMTP_HOST;
const smtpPort = parseInt(process.env.SMTP_PORT || '587', 10);
const smtpUser = process.env.SMTP_USER;
const smtpPass = process.env.SMTP_PASS;

if (!smtpHost || !smtpUser || !smtpPass) {
  console.warn('SMTP_* not set. Worker will skip sending. Set SMTP_HOST, SMTP_USER, SMTP_PASS to enable.');
}

const transporter = smtpHost && smtpUser && smtpPass
  ? nodemailer.createTransport({
      host: smtpHost,
      port: smtpPort,
      secure: smtpPort === 465,
      auth: { user: smtpUser, pass: smtpPass },
    })
  : null;

async function processOne(): Promise<boolean> {
  const [row] = await db
    .select()
    .from(outboundQueue)
    .where(eq(outboundQueue.status, 'pending'))
    .limit(1);
  if (!row) return false;

  const [emailRow] = await db
    .select()
    .from(emails)
    .where(eq(emails.id, row.emailId))
    .limit(1);
  if (!emailRow) {
    await db.update(outboundQueue).set({ status: 'failed', lastError: 'Email not found' }).where(eq(outboundQueue.id, row.id));
    return true;
  }

  const [bodyRow] = await db.select().from(emailBodies).where(eq(emailBodies.emailId, emailRow.id)).limit(1);
  const toAddresses = (emailRow.toAddresses ? JSON.parse(emailRow.toAddresses as string) : []) as string[];
  const text = bodyRow?.bodyEncrypted ?? '[Encrypted content]';

  if (!transporter) {
    console.log('Skipping send (no SMTP):', emailRow.id);
    await db
      .update(outboundQueue)
      .set({ status: 'sent', processedAt: new Date() })
      .where(eq(outboundQueue.id, row.id));
    return true;
  }

  try {
    await transporter.sendMail({
      from: emailRow.fromAddress,
      to: toAddresses.join(', '),
      subject: (emailRow.subjectPlain as string) || emailRow.subjectEncrypted || '(No subject)',
      text,
      html: text.startsWith('<') ? text : undefined,
    });
    await db
      .update(outboundQueue)
      .set({ status: 'sent', processedAt: new Date() })
      .where(eq(outboundQueue.id, row.id));
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    await db
      .update(outboundQueue)
      .set({
        status: 'pending',
        lastError: msg,
        attempts: (row.attempts ?? 0) + 1,
      })
      .where(eq(outboundQueue.id, row.id));
  }
  return true;
}

async function run() {
  while (true) {
    try {
      const had = await processOne();
      if (!had) await new Promise((r) => setTimeout(r, POLL_MS));
    } catch (e) {
      console.error('SMTP worker error', e);
      await new Promise((r) => setTimeout(r, POLL_MS));
    }
  }
}

run();
