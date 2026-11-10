import './env.ts';
import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import { attachDatabasePool } from '@neon/functions';
import * as schema from './schema.ts';

export function connectDatabase(url = process.env.DATABASE_URL) {
  if (!url) throw new Error('Set DATABASE_URL on the API server.');
  const pool = new Pool({ connectionString: url, max: 5, connectionTimeoutMillis: 10000, idleTimeoutMillis: 30000 });
  attachDatabasePool(pool);
  return { db: drizzle(pool, { schema }), close: () => pool.end() };
}
export type Database = ReturnType<typeof connectDatabase>['db'];
