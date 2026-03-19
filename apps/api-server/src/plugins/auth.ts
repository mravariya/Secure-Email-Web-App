import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import fp from 'fastify-plugin';
import jwt from 'jsonwebtoken';
import { config } from '../config.js';

export interface JwtPayload {
  sub: string;
  email: string;
  type: 'access' | 'refresh';
  iat?: number;
  exp?: number;
}

declare module 'fastify' {
  interface FastifyRequest {
    userId?: string;
    userEmail?: string;
  }
}

async function authPluginImpl(app: FastifyInstance) {
  app.decorate('authenticate', async function (req: FastifyRequest, reply: FastifyReply) {
    const auth = req.headers.authorization;
    const token = auth?.startsWith('Bearer ') ? auth.slice(7) : null;
    if (!token) {
      return reply.status(401).send({
        error: { code: 'UNAUTHORIZED', message: 'Missing or invalid token' },
      });
    }
    try {
      const decoded = jwt.verify(token, config.jwtSecret) as JwtPayload;
      if (decoded.type !== 'access') {
        return reply.status(401).send({
          error: { code: 'UNAUTHORIZED', message: 'Invalid token type' },
        });
      }
      req.userId = decoded.sub;
      req.userEmail = decoded.email;
    } catch {
      return reply.status(401).send({
        error: { code: 'UNAUTHORIZED', message: 'Invalid or expired token' },
      });
    }
  });
}

export const authPlugin = fp(authPluginImpl, { name: 'auth' });
