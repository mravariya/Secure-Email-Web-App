import { FastifyInstance } from 'fastify';
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
declare function authPluginImpl(app: FastifyInstance): Promise<void>;
export declare const authPlugin: typeof authPluginImpl;
export {};
//# sourceMappingURL=auth.d.ts.map