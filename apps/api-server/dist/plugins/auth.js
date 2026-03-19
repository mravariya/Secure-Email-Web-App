import fp from 'fastify-plugin';
import jwt from 'jsonwebtoken';
import { config } from '../config.js';
async function authPluginImpl(app) {
    app.decorate('authenticate', async function (req, reply) {
        const auth = req.headers.authorization;
        const token = auth?.startsWith('Bearer ') ? auth.slice(7) : null;
        if (!token) {
            return reply.status(401).send({
                error: { code: 'UNAUTHORIZED', message: 'Missing or invalid token' },
            });
        }
        try {
            const decoded = jwt.verify(token, config.jwtSecret);
            if (decoded.type !== 'access') {
                return reply.status(401).send({
                    error: { code: 'UNAUTHORIZED', message: 'Invalid token type' },
                });
            }
            req.userId = decoded.sub;
            req.userEmail = decoded.email;
        }
        catch {
            return reply.status(401).send({
                error: { code: 'UNAUTHORIZED', message: 'Invalid or expired token' },
            });
        }
    });
}
export const authPlugin = fp(authPluginImpl, { name: 'auth' });
//# sourceMappingURL=auth.js.map