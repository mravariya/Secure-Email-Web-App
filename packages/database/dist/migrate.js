import { drizzle } from 'drizzle-orm/node-postgres';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import pg from 'pg';
import path from 'path';
import { fileURLToPath } from 'url';
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const connectionString = process.env.DATABASE_URL ||
    'postgresql://postgres:postgres@localhost:5432/secure_email';
async function run() {
    const pool = new pg.Pool({ connectionString });
    const db = drizzle(pool);
    const migrationsFolder = path.join(__dirname, '..', 'migrations');
    await migrate(db, { migrationsFolder });
    await pool.end();
    console.log('Migrations completed');
}
run().catch((e) => {
    console.error('Migration failed', e);
    process.exit(1);
});
//# sourceMappingURL=migrate.js.map