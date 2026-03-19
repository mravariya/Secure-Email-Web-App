import { drizzle } from 'drizzle-orm/node-postgres';
import * as schema from './schema.js';
export type Database = ReturnType<typeof drizzle>;
export declare const db: import("drizzle-orm/node-postgres").NodePgDatabase<typeof schema>;
//# sourceMappingURL=client.d.ts.map