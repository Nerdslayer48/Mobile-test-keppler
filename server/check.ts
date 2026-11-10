import { sql } from 'drizzle-orm';
import { connectDatabase } from './db.ts';

let connection: ReturnType<typeof connectDatabase> | undefined;
try {
  connection = connectDatabase();
  await connection.db.execute(sql`select 1`);
  console.log('Neon database connection successful.');
} catch {
  console.error('Unable to connect. Set DATABASE_URL in .env and check network access.');
  process.exitCode = 1;
} finally { await connection?.close(); }
