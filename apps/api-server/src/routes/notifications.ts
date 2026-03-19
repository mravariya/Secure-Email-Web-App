import { FastifyInstance } from 'fastify';
import { db } from '@secure-email/database';
import { notifications } from '@secure-email/database';
import { eq, and } from 'drizzle-orm';

export async function registerNotificationRoutes(app: FastifyInstance) {
  const authenticate = (app as unknown as { authenticate: (req: unknown, reply: unknown) => Promise<unknown> }).authenticate;

  app.get('/api/v1/notifications', { preHandler: [authenticate] }, async (req, reply) => {
    const userId = req.userId!;
    const list = await db
      .select()
      .from(notifications)
      .where(eq(notifications.userId, userId))
      .orderBy(notifications.createdAt);
    return reply.send({ notifications: list });
  });

  app.patch<{
    Params: { id: string };
  }>('/api/v1/notifications/:id/read', { preHandler: [authenticate] }, async (req, reply) => {
    const userId = req.userId!;
    const id = req.params.id;
    await db
      .update(notifications)
      .set({ readAt: new Date() })
      .where(and(eq(notifications.id, id), eq(notifications.userId, userId)));
    return reply.send({ ok: true });
  });

  app.post<{
    Body: { subscription?: unknown };
  }>('/api/v1/notifications/push/subscribe', { preHandler: [authenticate] }, async (req, reply) => {
    const subscription = req.body?.subscription;
    if (!subscription) {
      return reply.status(400).send({
        error: { code: 'VALIDATION_ERROR', message: 'subscription required' },
      });
    }
    // In production: store subscription in DB (e.g. push_subscriptions table) for Web Push
    return reply.send({ ok: true });
  });
}
