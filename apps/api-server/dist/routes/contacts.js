import { db } from '@secure-email/database';
import { contacts } from '@secure-email/database';
import { eq } from 'drizzle-orm';
export async function registerContactRoutes(app) {
    const authenticate = app.authenticate;
    app.get('/api/v1/contacts', { preHandler: [authenticate] }, async (req, reply) => {
        const userId = req.userId;
        const list = await db
            .select()
            .from(contacts)
            .where(eq(contacts.userId, userId));
        return reply.send({ contacts: list });
    });
    app.post('/api/v1/contacts', { preHandler: [authenticate] }, async (req, reply) => {
        const userId = req.userId;
        const payloadEncrypted = req.body?.payloadEncrypted;
        if (!payloadEncrypted) {
            return reply.status(400).send({
                error: { code: 'VALIDATION_ERROR', message: 'payloadEncrypted required' },
            });
        }
        const [c] = await db
            .insert(contacts)
            .values({ userId, payloadEncrypted })
            .returning();
        return reply.send(c);
    });
    app.patch('/api/v1/contacts/:id', { preHandler: [authenticate] }, async (req, reply) => {
        const userId = req.userId;
        const id = req.params.id;
        const payloadEncrypted = req.body?.payloadEncrypted;
        if (!payloadEncrypted) {
            return reply.status(400).send({
                error: { code: 'VALIDATION_ERROR', message: 'payloadEncrypted required' },
            });
        }
        await db
            .update(contacts)
            .set({ payloadEncrypted, updatedAt: new Date() })
            .where(eq(contacts.id, id));
        const [c] = await db.select().from(contacts).where(eq(contacts.id, id)).limit(1);
        if (!c || c.userId !== userId) {
            return reply.status(404).send({ error: { code: 'NOT_FOUND', message: 'Contact not found' } });
        }
        return reply.send(c);
    });
    app.delete('/api/v1/contacts/:id', { preHandler: [authenticate] }, async (req, reply) => {
        const userId = req.userId;
        const id = req.params.id;
        const [c] = await db.select().from(contacts).where(eq(contacts.id, id)).limit(1);
        if (!c || c.userId !== userId) {
            return reply.status(404).send({ error: { code: 'NOT_FOUND', message: 'Contact not found' } });
        }
        await db.delete(contacts).where(eq(contacts.id, id));
        return reply.send({ ok: true });
    });
}
//# sourceMappingURL=contacts.js.map