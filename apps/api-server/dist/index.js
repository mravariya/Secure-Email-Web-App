import Fastify from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import rateLimit from '@fastify/rate-limit';
import { config } from './config.js';
import { registerAuthRoutes } from './routes/auth.js';
import { registerUserKeysRoutes } from './routes/user-keys.js';
import { registerMailboxRoutes } from './routes/mailbox.js';
import { registerEmailRoutes } from './routes/emails.js';
import { registerAttachmentRoutes } from './routes/attachments.js';
import { registerContactRoutes } from './routes/contacts.js';
import { registerSearchRoutes } from './routes/search.js';
import { registerNotificationRoutes } from './routes/notifications.js';
import { authPlugin } from './plugins/auth.js';
import multipart from '@fastify/multipart';
const app = Fastify({ logger: true });
async function main() {
    await app.register(helmet, { contentSecurityPolicy: false });
    await app.register(multipart, { limits: { fileSize: 25 * 1024 * 1024 } });
    await app.register(cors, {
        origin: config.corsOrigin,
        credentials: true,
    });
    await app.register(rateLimit, {
        max: 100,
        timeWindow: '1 minute',
    });
    await app.register(authPlugin);
    await registerAuthRoutes(app);
    await registerUserKeysRoutes(app);
    await registerMailboxRoutes(app);
    await registerEmailRoutes(app);
    await registerAttachmentRoutes(app);
    await registerContactRoutes(app);
    await registerSearchRoutes(app);
    await registerNotificationRoutes(app);
    app.get('/health', (_, reply) => reply.send({ status: 'ok' }));
    const port = config.port;
    await app.listen({ port, host: '0.0.0.0' });
    console.log(`API server listening on port ${port}`);
}
main().catch((err) => {
    app.log.error(err);
    process.exit(1);
});
//# sourceMappingURL=index.js.map