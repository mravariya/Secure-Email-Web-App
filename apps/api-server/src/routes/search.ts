import { FastifyInstance } from 'fastify';
import { db } from '@secure-email/database';
import { mailboxes, emails } from '@secure-email/database';
import { eq, and, desc, sql, or, like } from 'drizzle-orm';

export async function registerSearchRoutes(app: FastifyInstance) {
  const authenticate = (app as unknown as { authenticate: (req: unknown, reply: unknown) => Promise<unknown> }).authenticate;

  app.get<{
    Querystring: {
      q?: string;
      folder?: string;
      from?: string;
      to?: string;
      date_from?: string;
      date_to?: string;
      limit?: string;
      offset?: string;
    };
  }>('/api/v1/search', { preHandler: [authenticate] }, async (req, reply) => {
    const userId = req.userId!;
    const {
      q,
      folder,
      from,
      to,
      date_from,
      date_to,
      limit = '50',
      offset = '0',
    } = req.query;

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

    const limitNum = Math.min(parseInt(limit, 10) || 50, 100);
    const offsetNum = parseInt(offset, 10) || 0;

    let conditions = [eq(emails.mailboxId, mailbox.id)];
    if (folder) conditions.push(eq(emails.folder, folder));
    if (from) conditions.push(like(emails.fromAddress, `%${from}%`));
    if (to) conditions.push(like(emails.toAddresses, `%${to}%`));
    if (date_from) {
      conditions.push(sql`${emails.receivedAt} >= ${new Date(date_from)}`);
    }
    if (date_to) {
      conditions.push(sql`${emails.receivedAt} <= ${new Date(date_to)}`);
    }
    if (q) {
      conditions.push(
        or(
          like(emails.fromAddress, `%${q}%`),
          like(emails.toAddresses, `%${q}%`),
          like(emails.subjectPlain, `%${q}%`),
          like(emails.subjectEncrypted, `%${q}%`)
        )!
      );
    }

    const results = await db
      .select({
        id: emails.id,
        fromAddress: emails.fromAddress,
        toAddresses: emails.toAddresses,
        subjectEncrypted: emails.subjectEncrypted,
        subjectPlain: emails.subjectPlain,
        folder: emails.folder,
        receivedAt: emails.receivedAt,
        isRead: emails.isRead,
      })
      .from(emails)
      .where(and(...conditions))
      .orderBy(desc(emails.receivedAt))
      .limit(limitNum)
      .offset(offsetNum);

    return reply.send({ results });
  });
}
