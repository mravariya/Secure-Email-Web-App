import jwt from 'jsonwebtoken';
import { nanoid } from 'nanoid';
import { db } from '@secure-email/database';
import { users, mailboxes, sessions, verificationTokens, } from '@secure-email/database';
import { hashPassword, verifyPassword, hashToken } from '@secure-email/crypto';
import { config } from '../config.js';
import { eq, and, gt } from 'drizzle-orm';
import { authenticator } from 'otplib';
const REFRESH_TOKEN_EXPIRY_DAYS = 7;
export async function registerAuthRoutes(app) {
    const authenticate = app.authenticate;
    app.post('/api/v1/auth/register', async (req, reply) => {
        const { email, password } = req.body || {};
        if (!email || !password || password.length < 8) {
            return reply.status(400).send({
                error: {
                    code: 'VALIDATION_ERROR',
                    message: 'Email and password (min 8 chars) required',
                },
            });
        }
        const normalizedEmail = email.toLowerCase().trim();
        const [existing] = await db
            .select()
            .from(users)
            .where(eq(users.email, normalizedEmail))
            .limit(1);
        if (existing) {
            return reply.status(409).send({
                error: { code: 'EMAIL_EXISTS', message: 'Email already registered' },
            });
        }
        const passwordHash = await hashPassword(password);
        const [user] = await db
            .insert(users)
            .values({
            email: normalizedEmail,
            passwordHash,
        })
            .returning();
        if (!user)
            return reply.status(500).send({ error: { code: 'INTERNAL', message: 'Insert failed' } });
        const mailbox = await db
            .insert(mailboxes)
            .values({ userId: user.id })
            .returning()
            .then((r) => r[0]);
        if (!mailbox) {
            // rollback user? for simplicity continue
        }
        const verificationToken = nanoid(32);
        await db.insert(verificationTokens).values({
            userId: user.id,
            token: verificationToken,
            type: 'email_verification',
            expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
        });
        // In production: send email with link containing verificationToken
        const accessToken = signAccess(user.id, user.email);
        const refreshToken = nanoid(64);
        const refreshTokenHash = await hashToken(refreshToken);
        await db.insert(sessions).values({
            userId: user.id,
            refreshTokenHash,
            expiresAt: new Date(Date.now() + REFRESH_TOKEN_EXPIRY_DAYS * 24 * 60 * 60 * 1000),
        });
        return reply.send({
            user: { id: user.id, email: user.email, emailVerified: !!user.emailVerifiedAt },
            accessToken,
            refreshToken,
            expiresIn: 900,
            message: 'Verify your email. Check your inbox for the link.',
            verificationToken: config.nodeEnv === 'development' ? verificationToken : undefined,
        });
    });
    app.post('/api/v1/auth/login', async (req, reply) => {
        const { email, password } = req.body || {};
        if (!email || !password) {
            return reply.status(400).send({
                error: { code: 'VALIDATION_ERROR', message: 'Email and password required' },
            });
        }
        const [user] = await db
            .select()
            .from(users)
            .where(eq(users.email, email.toLowerCase().trim()))
            .limit(1);
        if (!user || !(await verifyPassword(user.passwordHash, password))) {
            return reply.status(401).send({
                error: { code: 'INVALID_CREDENTIALS', message: 'Invalid email or password' },
            });
        }
        const accessToken = signAccess(user.id, user.email);
        const refreshToken = nanoid(64);
        const refreshTokenHash = await hashToken(refreshToken);
        await db.insert(sessions).values({
            userId: user.id,
            refreshTokenHash,
            expiresAt: new Date(Date.now() + REFRESH_TOKEN_EXPIRY_DAYS * 24 * 60 * 60 * 1000),
        });
        return reply.send({
            user: { id: user.id, email: user.email, emailVerified: !!user.emailVerifiedAt },
            accessToken,
            refreshToken,
            expiresIn: 900,
        });
    });
    app.post('/api/v1/auth/refresh', async (req, reply) => {
        const refreshToken = req.body?.refreshToken;
        if (!refreshToken) {
            return reply.status(401).send({
                error: { code: 'UNAUTHORIZED', message: 'Refresh token required' },
            });
        }
        const hash = await hashToken(refreshToken);
        const [session] = await db
            .select({ userId: sessions.userId, expiresAt: sessions.expiresAt })
            .from(sessions)
            .where(and(eq(sessions.refreshTokenHash, hash), gt(sessions.expiresAt, new Date())))
            .limit(1);
        if (!session) {
            return reply.status(401).send({
                error: { code: 'UNAUTHORIZED', message: 'Invalid or expired refresh token' },
            });
        }
        const [user] = await db.select().from(users).where(eq(users.id, session.userId)).limit(1);
        if (!user) {
            return reply.status(401).send({ error: { code: 'UNAUTHORIZED', message: 'User not found' } });
        }
        const accessToken = signAccess(user.id, user.email);
        return reply.send({ accessToken, expiresIn: 900 });
    });
    app.post('/api/v1/auth/logout', async (req, reply) => {
        const refreshToken = req.body?.refreshToken;
        if (refreshToken) {
            const hash = await hashToken(refreshToken);
            await db.delete(sessions).where(eq(sessions.refreshTokenHash, hash));
        }
        return reply.send({ ok: true });
    });
    app.get('/api/v1/auth/me', { preHandler: [authenticate] }, async (req, reply) => {
        const userId = req.userId;
        const [user] = await db
            .select({
            id: users.id,
            email: users.email,
            emailVerifiedAt: users.emailVerifiedAt,
            totpEnabled: users.totpEnabled,
            createdAt: users.createdAt,
        })
            .from(users)
            .where(eq(users.id, userId))
            .limit(1);
        if (!user)
            return reply.status(404).send({ error: { code: 'NOT_FOUND', message: 'User not found' } });
        return reply.send({
            id: user.id,
            email: user.email,
            emailVerified: !!user.emailVerifiedAt,
            totpEnabled: !!user.totpEnabled,
            createdAt: user.createdAt,
        });
    });
    app.post('/api/v1/auth/verify-email', async (req, reply) => {
        const token = req.body?.token;
        if (!token) {
            return reply.status(400).send({
                error: { code: 'VALIDATION_ERROR', message: 'Token required' },
            });
        }
        const [vt] = await db
            .select()
            .from(verificationTokens)
            .where(and(eq(verificationTokens.token, token), eq(verificationTokens.type, 'email_verification'), gt(verificationTokens.expiresAt, new Date())))
            .limit(1);
        if (!vt) {
            return reply.status(400).send({
                error: { code: 'INVALID_TOKEN', message: 'Invalid or expired verification token' },
            });
        }
        await db.update(users).set({ emailVerifiedAt: new Date(), updatedAt: new Date() }).where(eq(users.id, vt.userId));
        await db.delete(verificationTokens).where(eq(verificationTokens.id, vt.id));
        return reply.send({ ok: true, message: 'Email verified' });
    });
    app.post('/api/v1/auth/forgot-password', async (req, reply) => {
        const email = req.body?.email?.toLowerCase()?.trim();
        if (!email) {
            return reply.status(400).send({
                error: { code: 'VALIDATION_ERROR', message: 'Email required' },
            });
        }
        const [user] = await db.select().from(users).where(eq(users.email, email)).limit(1);
        if (user) {
            const resetToken = nanoid(32);
            await db.insert(verificationTokens).values({
                userId: user.id,
                token: resetToken,
                type: 'password_reset',
                expiresAt: new Date(Date.now() + 60 * 60 * 1000),
            });
            // In production: send email with reset link containing resetToken
        }
        return reply.send({ ok: true, message: 'If the email exists, a reset link was sent.' });
    });
    app.post('/api/v1/auth/reset-password', async (req, reply) => {
        const { token, newPassword } = req.body || {};
        if (!token || !newPassword || newPassword.length < 8) {
            return reply.status(400).send({
                error: { code: 'VALIDATION_ERROR', message: 'Token and new password (min 8 chars) required' },
            });
        }
        const [vt] = await db
            .select()
            .from(verificationTokens)
            .where(and(eq(verificationTokens.token, token), eq(verificationTokens.type, 'password_reset'), gt(verificationTokens.expiresAt, new Date())))
            .limit(1);
        if (!vt) {
            return reply.status(400).send({
                error: { code: 'INVALID_TOKEN', message: 'Invalid or expired reset token' },
            });
        }
        const passwordHash = await hashPassword(newPassword);
        await db
            .update(users)
            .set({ passwordHash, updatedAt: new Date() })
            .where(eq(users.id, vt.userId));
        await db.delete(verificationTokens).where(eq(verificationTokens.id, vt.id));
        return reply.send({ ok: true, message: 'Password reset successful' });
    });
    app.post('/api/v1/auth/2fa/enable', { preHandler: [authenticate] }, async (req, reply) => {
        const userId = req.userId;
        const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
        if (!user)
            return reply.status(404).send({ error: { code: 'NOT_FOUND', message: 'User not found' } });
        const secret = authenticator.generateSecret();
        const otpauth = authenticator.keyuri(user.email, 'SecureEmail', secret);
        await db
            .update(users)
            .set({
            totpSecretEncrypted: secret,
            updatedAt: new Date(),
        })
            .where(eq(users.id, userId));
        return reply.send({
            secret,
            otpauthUrl: otpauth,
            message: 'Verify with TOTP to enable 2FA',
        });
    });
    app.post('/api/v1/auth/2fa/verify', { preHandler: [authenticate] }, async (req, reply) => {
        const userId = req.userId;
        const token = req.body?.token;
        if (!token) {
            return reply.status(400).send({
                error: { code: 'VALIDATION_ERROR', message: 'TOTP token required' },
            });
        }
        const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
        if (!user || !user.totpSecretEncrypted) {
            return reply.status(400).send({
                error: { code: 'BAD_REQUEST', message: 'Enable 2FA first' },
            });
        }
        const valid = authenticator.verify({ token, secret: user.totpSecretEncrypted });
        if (!valid) {
            return reply.status(400).send({
                error: { code: 'INVALID_TOTP', message: 'Invalid TOTP code' },
            });
        }
        await db
            .update(users)
            .set({ totpEnabled: true, updatedAt: new Date() })
            .where(eq(users.id, userId));
        return reply.send({ ok: true, message: '2FA enabled' });
    });
    app.post('/api/v1/auth/2fa/disable', { preHandler: [authenticate] }, async (req, reply) => {
        const userId = req.userId;
        const { password, token } = req.body || {};
        const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
        if (!user)
            return reply.status(404).send({ error: { code: 'NOT_FOUND', message: 'User not found' } });
        if (!(await verifyPassword(user.passwordHash, password || ''))) {
            return reply.status(401).send({
                error: { code: 'INVALID_PASSWORD', message: 'Invalid password' },
            });
        }
        if (user.totpEnabled && user.totpSecretEncrypted) {
            const valid = authenticator.verify({ token: token || '', secret: user.totpSecretEncrypted });
            if (!valid) {
                return reply.status(400).send({
                    error: { code: 'INVALID_TOTP', message: 'Invalid TOTP code' },
                });
            }
        }
        await db
            .update(users)
            .set({ totpEnabled: false, totpSecretEncrypted: null, updatedAt: new Date() })
            .where(eq(users.id, userId));
        return reply.send({ ok: true, message: '2FA disabled' });
    });
}
function signAccess(userId, email) {
    return jwt.sign({ sub: userId, email, type: 'access' }, config.jwtSecret, { expiresIn: config.jwtAccessExpiry });
}
//# sourceMappingURL=auth.js.map