import assert from 'node:assert/strict';
import { PGlite } from '@electric-sql/pglite';
import { drizzle } from 'drizzle-orm/pglite';
import { migrate } from 'drizzle-orm/pglite/migrator';
import { eq } from 'drizzle-orm';
import { companies, identities, sessions, datasets, boards, media } from './schema.ts';

// PostgreSQL in memory for schema validation only; the application uses Neon.
const client = new PGlite();
const db = drizzle(client);
try {
  await migrate(db, { migrationsFolder: './drizzle' });
  // Reapplying migrations must be safe.
  await migrate(db, { migrationsFolder: './drizzle' });
  await db.insert(companies).values([{ id: 'a', companyName: 'Company A' }, { id: 'b', companyName: 'Company B' }]);
  await db.insert(identities).values({ id: 'owner-a', companyId: 'a', kind: 'owner', email: 'owner@example.test', name: 'Owner', passwordHash: 'hash' });
  await db.insert(identities).values({ id: 'staff-a', companyId: 'a', kind: 'staff', email: 'staff@example.test', name: 'Staff', tokenHash: 'unique-hash', tokenCipher: 'encrypted-token' });
  await assert.rejects(db.insert(identities).values({ id: 'duplicate-email', companyId: 'b', kind: 'owner', email: 'staff@example.test', name: 'Duplicate', passwordHash: 'hash' }));
  await assert.rejects(db.insert(identities).values({ id: 'duplicate-token', companyId: 'b', kind: 'staff', email: 'other@example.test', name: 'Duplicate', tokenHash: 'unique-hash', tokenCipher: 'encrypted-token' }));
  await assert.rejects(db.insert(identities).values({ id: 'plaintext-owner', companyId: 'b', kind: 'owner', email: 'invalid@example.test', name: 'Invalid' }));
  await assert.rejects(db.insert(identities).values({ id: 'mixed-email', companyId: 'b', kind: 'staff', email: 'UPPER@example.test', name: 'Invalid', tokenHash: 'other-hash', tokenCipher: 'cipher' }));
  await assert.rejects(db.insert(sessions).values({ tokenHash: 'cross-tenant', companyId: 'b', identityId: 'staff-a', expiresAt: new Date(Date.now() + 10000) }));
  await db.insert(sessions).values({ tokenHash: 'valid', companyId: 'a', identityId: 'staff-a', expiresAt: new Date(Date.now() + 10000) });
  await db.insert(datasets).values([{ companyId: 'a', key: 'clients', value: [{ id: 'client-a' }] }, { companyId: 'b', key: 'clients', value: [{ id: 'client-b' }] }]);
  assert.deepEqual((await db.select().from(datasets).where(eq(datasets.companyId, 'a')))[0].value, [{ id: 'client-a' }]);
  await db.insert(boards).values({ companyId: 'a', key: 'board', value: [{ kind: 'section', name: 'Section' }] });
  const content = Buffer.from('media bytes');
  await db.insert(media).values({ id: 'media-a', companyId: 'a', digest: 'sha256', mimeType: 'image/png', content });
  assert.deepEqual(Buffer.from((await db.select().from(media))[0].content), content);
  await db.delete(companies).where(eq(companies.id, 'a'));
  assert.equal((await db.select().from(sessions)).length, 0);
  assert.equal((await db.select().from(boards)).length, 0);
  assert.equal((await db.select().from(media)).length, 0);
  assert.equal((await db.select().from(datasets)).length, 1);
  console.log('PASS: migration replay, unique emails/tokens, credential checks, company-bound sessions, tenant keys, media round-trip, and cascading cleanup.');
} finally { await client.close(); }
