import fs from 'fs/promises';
import path from 'path';
import { db } from '@secure-email/database';
import { mailboxes, emails, attachments } from '@secure-email/database';
import { eq, and } from 'drizzle-orm';
import { config } from '../config.js';
const UPLOAD_DIR = config.attachmentStoragePath;
const MAX_FILE_SIZE = 25 * 1024 * 1024; // 25 MB
export async function registerAttachmentRoutes(app) {
    const authenticate = app.authenticate;
    await fs.mkdir(UPLOAD_DIR, { recursive: true }).catch(() => { });
    app.post('/api/v1/attachments/upload', { preHandler: [authenticate] }, async (req, reply) => {
        const userId = req.userId;
        const data = await req.file();
        if (!data) {
            return reply.status(400).send({
                error: { code: 'VALIDATION_ERROR', message: 'No file in multipart upload' },
            });
        }
        const emailId = req.query?.emailId;
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
        const buffer = await data.toBuffer();
        if (buffer.length > MAX_FILE_SIZE) {
            return reply.status(400).send({
                error: { code: 'FILE_TOO_LARGE', message: 'Max file size 25 MB' },
            });
        }
        const filename = data.filename || 'attachment';
        const ext = path.extname(filename) || '';
        const storageName = `${Date.now()}-${Math.random().toString(36).slice(2)}${ext}`;
        const storagePath = path.join(UPLOAD_DIR, storageName);
        await fs.writeFile(storagePath, buffer);
        let resolvedEmailId = null;
        if (emailId) {
            const [email] = await db
                .select()
                .from(emails)
                .where(and(eq(emails.id, emailId), eq(emails.mailboxId, mailbox.id)))
                .limit(1);
            if (email)
                resolvedEmailId = email.id;
        }
        if (!resolvedEmailId) {
            const [draft] = await db
                .insert(emails)
                .values({
                mailboxId: mailbox.id,
                folder: 'drafts',
                fromAddress: req.userEmail,
                toAddresses: '[]',
            })
                .returning();
            resolvedEmailId = draft?.id ?? null;
        }
        const [att] = await db
            .insert(attachments)
            .values({
            emailId: resolvedEmailId,
            storagePath,
            filenameEncrypted: filename,
            sizeBytes: buffer.length,
        })
            .returning();
        return reply.send({
            id: att.id,
            emailId: resolvedEmailId,
            storagePath: att.storagePath,
            sizeBytes: att.sizeBytes,
            filename: filename,
        });
    });
    app.get('/api/v1/attachments/:id', { preHandler: [authenticate] }, async (req, reply) => {
        const userId = req.userId;
        const attachmentId = req.params.id;
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
        const [row] = await db
            .select({ attachment: attachments })
            .from(attachments)
            .innerJoin(emails, eq(emails.id, attachments.emailId))
            .where(and(eq(attachments.id, attachmentId), eq(emails.mailboxId, mailbox.id)))
            .limit(1);
        const attachment = row?.attachment;
        if (!attachment) {
            return reply.status(404).send({
                error: { code: 'NOT_FOUND', message: 'Attachment not found' },
            });
        }
        try {
            const buf = await fs.readFile(attachment.storagePath);
            reply.header('Content-Type', 'application/octet-stream');
            reply.header('Content-Disposition', `attachment; filename="${encodeURIComponent(attachment.filenameEncrypted || 'download')}"`);
            return reply.send(buf);
        }
        catch {
            return reply.status(404).send({
                error: { code: 'NOT_FOUND', message: 'File not found on disk' },
            });
        }
    });
    app.get('/api/v1/attachments/:id/download', { preHandler: [authenticate] }, async (req, reply) => {
        const id = req.params.id;
        const url = req.url.replace('/download', '');
        return reply.redirect(302, url || `/api/v1/attachments/${id}`);
    });
}
//# sourceMappingURL=attachments.js.map