import { FastifyInstance } from 'fastify';
import { db } from '@secure-email/database';
import { mailboxes, emails, emailThreads } from '@secure-email/database';
import { eq, and, desc } from 'drizzle-orm';

export async function registerMailboxRoutes(app: FastifyInstance) {
  const authenticate = (app as unknown as { authenticate: (req: unknown, reply: unknown) => Promise<unknown> }).authenticate;

  app.get('/api/v1/mailboxes', { preHandler: [authenticate] }, async (req, reply) => {
    const userId = req.userId!;
    const [mailbox] = await db
      .select()
      .from(mailboxes)
      .where(eq(mailboxes.userId, userId))
      .limit(1);
    if (!mailbox) {
      return reply.status(404).send({
        error: { code: 'NOT_FOUND', message: 'Mailbox not found' },
      });
    }
    return reply.send({
      id: mailbox.id,
      userId: mailbox.userId,
      createdAt: mailbox.createdAt,
    });
  });

  app.get<{
    Params: { id: string };
    Querystring: { folder?: string; limit?: string; offset?: string };
  }>('/api/v1/mailboxes/:id/emails', { preHandler: [authenticate] }, async (req, reply) => {
    const userId = req.userId!;
    const mailboxId = req.params.id;
    const folder = req.query.folder || 'inbox';
    const limit = Math.min(parseInt(req.query.limit || '50', 10), 100);
    const offset = parseInt(req.query.offset || '0', 10);

    const [mailbox] = await db
      .select()
      .from(mailboxes)
      .where(and(eq(mailboxes.id, mailboxId), eq(mailboxes.userId, userId)))
      .limit(1);
    if (!mailbox) {
      return reply.status(404).send({
        error: { code: 'NOT_FOUND', message: 'Mailbox not found' },
      });
    }

    const list = await db
      .select({
        id: emails.id,
        messageId: emails.messageId,
        fromAddress: emails.fromAddress,
        toAddresses: emails.toAddresses,
        subjectEncrypted: emails.subjectEncrypted,
        subjectPlain: emails.subjectPlain,
        folder: emails.folder,
        sentAt: emails.sentAt,
        receivedAt: emails.receivedAt,
        isRead: emails.isRead,
        isStarred: emails.isStarred,
        threadId: emails.threadId,
      })
      .from(emails)
      .where(and(eq(emails.mailboxId, mailboxId), eq(emails.folder, folder)))
      .orderBy(desc(emails.receivedAt))
      .limit(limit)
      .offset(offset);

    return reply.send({ emails: list });
  });

  app.get<{
    Params: { id: string };
    Querystring: { folder?: string };
  }>('/api/v1/mailboxes/:id/threads', { preHandler: [authenticate] }, async (req, reply) => {
    const userId = req.userId!;
    const mailboxId = req.params.id;
    const [mailbox] = await db
      .select()
      .from(mailboxes)
      .where(and(eq(mailboxes.id, mailboxId), eq(mailboxes.userId, userId)))
      .limit(1);
    if (!mailbox) {
      return reply.status(404).send({
        error: { code: 'NOT_FOUND', message: 'Mailbox not found' },
      });
    }

    let threadsQuery = db
      .select()
      .from(emailThreads)
      .where(eq(emailThreads.mailboxId, mailboxId))
      .orderBy(desc(emailThreads.updatedAt));

    const threads = await threadsQuery;
    return reply.send({ threads });
  });

  app.get<{
    Params: { id: string; threadId: string };
  }>('/api/v1/mailboxes/:id/threads/:threadId', { preHandler: [authenticate] }, async (req, reply) => {
    const userId = req.userId!;
    const { id: mailboxId, threadId } = req.params;

    const [mailbox] = await db
      .select()
      .from(mailboxes)
      .where(and(eq(mailboxes.id, mailboxId), eq(mailboxes.userId, userId)))
      .limit(1);
    if (!mailbox) {
      return reply.status(404).send({
        error: { code: 'NOT_FOUND', message: 'Mailbox not found' },
      });
    }

    const threadEmails = await db
      .select({
        id: emails.id,
        fromAddress: emails.fromAddress,
        toAddresses: emails.toAddresses,
        subjectEncrypted: emails.subjectEncrypted,
        subjectPlain: emails.subjectPlain,
        receivedAt: emails.receivedAt,
        isRead: emails.isRead,
      })
      .from(emails)
      .where(and(eq(emails.mailboxId, mailboxId), eq(emails.threadId, threadId)))
      .orderBy(emails.receivedAt);

    return reply.send({ emails: threadEmails });
  });
}
