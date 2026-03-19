import { db } from '@secure-email/database';
import { users, userKeys } from '@secure-email/database';
import { eq } from 'drizzle-orm';
export async function registerUserKeysRoutes(app) {
    const authenticate = app.authenticate;
    app.post('/api/v1/users/keys', { preHandler: [authenticate] }, async (req, reply) => {
        const userId = req.userId;
        const { publicKey, encryptedPrivateKey, keySalt, algorithm } = req.body || {};
        if (!publicKey || !encryptedPrivateKey || !keySalt || !algorithm) {
            return reply.status(400).send({
                error: {
                    code: 'VALIDATION_ERROR',
                    message: 'publicKey, encryptedPrivateKey, keySalt, algorithm required',
                },
            });
        }
        const [existing] = await db.select().from(userKeys).where(eq(userKeys.userId, userId)).limit(1);
        if (existing) {
            await db
                .update(userKeys)
                .set({
                publicKey,
                encryptedPrivateKey,
                keySalt,
                algorithm,
            })
                .where(eq(userKeys.userId, userId));
        }
        else {
            await db.insert(userKeys).values({
                userId,
                publicKey,
                encryptedPrivateKey,
                keySalt,
                algorithm,
            });
        }
        return reply.send({ ok: true });
    });
    app.get('/api/v1/users/me/keys', { preHandler: [authenticate] }, async (req, reply) => {
        const userId = req.userId;
        const [key] = await db.select().from(userKeys).where(eq(userKeys.userId, userId)).limit(1);
        if (!key) {
            return reply.status(404).send({
                error: { code: 'NOT_FOUND', message: 'No keys found. Upload keys first.' },
            });
        }
        return reply.send({
            publicKey: key.publicKey,
            encryptedPrivateKey: key.encryptedPrivateKey,
            keySalt: key.keySalt,
            algorithm: key.algorithm,
        });
    });
    app.get('/api/v1/users/public-key', { preHandler: [authenticate] }, async (req, reply) => {
        const email = req.query?.email?.toLowerCase()?.trim();
        if (!email) {
            return reply.status(400).send({
                error: { code: 'VALIDATION_ERROR', message: 'email query param required' },
            });
        }
        const [user] = await db.select({ id: users.id }).from(users).where(eq(users.email, email)).limit(1);
        if (!user) {
            return reply.status(404).send({
                error: { code: 'NOT_FOUND', message: 'User not found' },
            });
        }
        const [key] = await db
            .select({ publicKey: userKeys.publicKey })
            .from(userKeys)
            .where(eq(userKeys.userId, user.id))
            .limit(1);
        if (!key) {
            return reply.status(404).send({
                error: { code: 'NOT_FOUND', message: 'No public key for this user' },
            });
        }
        return reply.send({ publicKey: key.publicKey });
    });
}
//# sourceMappingURL=user-keys.js.map