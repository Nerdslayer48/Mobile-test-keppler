import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { connectDatabase } from './db.ts';

let connection: ReturnType<typeof connectDatabase> | undefined;
try {
  connection = connectDatabase(process.env.DATABASE_URL_UNPOOLED ?? process.env.DATABASE_URL);
  await migrate(connection.db, { migrationsFolder: './drizzle' });
  console.log('Database migrations applied.');
} catch {
  console.error('Migration failed. Check DATABASE_URL, network access, and database permissions.');
  process.exitCode = 1;
} finally { await connection?.close(); }
