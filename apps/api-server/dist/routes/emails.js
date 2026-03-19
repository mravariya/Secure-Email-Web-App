import { db } from '@secure-email/database';
import { mailboxes, emails, emailBodies, attachments, outboundQueue, } from '@secure-email/database';
import { eq, and } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';
export async function registerEmailRoutes(app) {
    const authenticate = app.authenticate;
    app.post('/api/v1/emails', { preHandler: [authenticate] }, async (req, reply) => {
        const userId = req.userId;
        const userEmail = req.userEmail;
        const body = req.body || {};
        const { to = [], cc = [], bcc = [], subject = '', subjectEncrypted, bodyEncrypted, draftId, sendNow = false, } = body;
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
        const folder = sendNow ? 'sent' : 'drafts';
        const messageId = sendNow
            ? `<${uuidv4()}@secure-email.local>`
            : null;
        const now = new Date();
        if (draftId) {
            const [existing] = await db
                .select()
                .from(emails)
                .where(and(eq(emails.id, draftId), eq(emails.mailboxId, mailbox.id)))
                .limit(1);
            if (existing && existing.folder === 'drafts') {
                await db
                    .update(emails)
                    .set({
                    toAddresses: JSON.stringify(to),
                    ccAddresses: JSON.stringify(cc),
                    bccAddresses: JSON.stringify(bcc),
                    subjectEncrypted: subjectEncrypted ?? existing.subjectEncrypted,
                    subjectPlain: subject || existing.subjectPlain,
                    folder,
                    messageId: messageId ?? existing.messageId,
                    sentAt: sendNow ? now : null,
                    updatedAt: now,
                })
                    .where(eq(emails.id, draftId));
                if (bodyEncrypted) {
                    await db
                        .update(emailBodies)
                        .set({ bodyEncrypted })
                        .where(eq(emailBodies.emailId, draftId));
                }
                const [updated] = await db
                    .select()
                    .from(emails)
                    .where(eq(emails.id, draftId))
                    .limit(1);
                return reply.send({
                    email: updated,
                    sent: sendNow,
                });
            }
        }
        const [email] = await db
            .insert(emails)
            .values({
            mailboxId: mailbox.id,
            folder,
            fromAddress: userEmail,
            toAddresses: JSON.stringify(to),
            ccAddresses: JSON.stringify(cc),
            bccAddresses: JSON.stringify(bcc),
            subjectEncrypted: subjectEncrypted ?? null,
            subjectPlain: subject || null,
            messageId,
            sentAt: sendNow ? now : null,
        })
            .returning();
        if (!email) {
            return reply.status(500).send({
                error: { code: 'INTERNAL', message: 'Failed to create email' },
            });
        }
        if (bodyEncrypted) {
            await db.insert(emailBodies).values({
                emailId: email.id,
                bodyEncrypted,
            });
        }
        if (sendNow) {
            await db.insert(outboundQueue).values({
                emailId: email.id,
                status: 'pending',
            });
        }
        return reply.send({
            email,
            sent: sendNow,
        });
    });
    app.get('/api/v1/emails/:id', { preHandler: [authenticate] }, async (req, reply) => {
        const userId = req.userId;
        const emailId = req.params.id;
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
        const [email] = await db
            .select()
            .from(emails)
            .where(and(eq(emails.id, emailId), eq(emails.mailboxId, mailbox.id)))
            .limit(1);
        if (!email) {
            return reply.status(404).send({
                error: { code: 'NOT_FOUND', message: 'Email not found' },
            });
        }
        const [body] = await db
            .select()
            .from(emailBodies)
            .where(eq(emailBodies.emailId, emailId))
            .limit(1);
        const attachmentList = await db
            .select({
            id: attachments.id,
            filenameEncrypted: attachments.filenameEncrypted,
            sizeBytes: attachments.sizeBytes,
            contentTypeEncrypted: attachments.contentTypeEncrypted,
        })
            .from(attachments)
            .where(eq(attachments.emailId, emailId));
        await db
            .update(emails)
            .set({ isRead: true, updatedAt: new Date() })
            .where(eq(emails.id, emailId));
        return reply.send({
            ...email,
            bodyEncrypted: body?.bodyEncrypted ?? null,
            bodyIv: body?.bodyIv ?? null,
            attachments: attachmentList,
        });
    });
    app.patch('/api/v1/emails/:id', { preHandler: [authenticate] }, async (req, reply) => {
        const userId = req.userId;
        const emailId = req.params.id;
        const { isRead, isStarred, folder } = req.body || {};
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
        const updates = { updatedAt: new Date() };
        if (typeof isRead === 'boolean')
            updates.isRead = isRead;
        if (typeof isStarred === 'boolean')
            updates.isStarred = isStarred;
        if (folder)
            updates.folder = folder;
        await db
            .update(emails)
            .set(updates)
            .where(and(eq(emails.id, emailId), eq(emails.mailboxId, mailbox.id)));
        const [updated] = await db
            .select()
            .from(emails)
            .where(eq(emails.id, emailId))
            .limit(1);
        return reply.send(updated);
    });
    app.delete('/api/v1/emails/:id', { preHandler: [authenticate] }, async (req, reply) => {
        const userId = req.userId;
        const emailId = req.params.id;
        const permanent = req.query.permanent === 'true';
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
        const [email] = await db
            .select()
            .from(emails)
            .where(and(eq(emails.id, emailId), eq(emails.mailboxId, mailbox.id)))
            .limit(1);
        if (!email) {
            return reply.status(404).send({
                error: { code: 'NOT_FOUND', message: 'Email not found' },
            });
        }
        if (permanent) {
            await db.delete(emails).where(eq(emails.id, emailId));
        }
        else {
            await db
                .update(emails)
                .set({ folder: 'trash', updatedAt: new Date() })
                .where(eq(emails.id, emailId));
        }
        return reply.send({ ok: true });
    });
}
//# sourceMappingURL=emails.js.map