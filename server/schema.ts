import { sql } from 'drizzle-orm';
import { check, customType, foreignKey, index, integer, jsonb, pgEnum, pgTable, primaryKey, text, timestamp, unique, uniqueIndex } from 'drizzle-orm/pg-core';

export const identityKind = pgEnum('identity_kind', ['owner', 'staff']);

export const companies = pgTable('companies', {
  id: text().primaryKey(), companyName: text().notNull(), createdAt: timestamp({ withTimezone: true }).defaultNow().notNull(),
});
export const identities = pgTable('identities', {
  id: text().primaryKey(), companyId: text().notNull().references(() => companies.id, { onDelete: 'cascade' }),
  kind: identityKind().notNull(), email: text().notNull().unique(), name: text().notNull(),
  accessRevokedAt: timestamp({ withTimezone: true }),
  passwordHash: text(), tokenHash: text().unique(), tokenCipher: text(), role: text().notNull().default(''), profilePicture: text().notNull().default(''),
  createdAt: timestamp({ withTimezone: true }).defaultNow().notNull(),
}, table => [
  unique('identities_company_id').on(table.companyId, table.id),
  check('identities_normalized_email', sql`${table.email} = lower(trim(${table.email}))`),
  check('identities_credentials', sql`(${table.kind} = 'owner' AND ${table.passwordHash} IS NOT NULL AND ${table.tokenHash} IS NULL AND ${table.tokenCipher} IS NULL) OR (${table.kind} = 'staff' AND ${table.passwordHash} IS NULL AND ${table.tokenHash} IS NOT NULL AND ${table.tokenCipher} IS NOT NULL)`),
  uniqueIndex('identities_one_owner_per_company').on(table.companyId).where(sql`${table.kind} = 'owner'`),
]);
export const sessions = pgTable('sessions', {
  tokenHash: text().primaryKey(), companyId: text().notNull().references(() => companies.id, { onDelete: 'cascade' }),
  identityId: text().notNull(),
  authenticatedAt: timestamp({ withTimezone: true }).defaultNow().notNull(), expiresAt: timestamp({ withTimezone: true }).notNull(),
}, table => [
  foreignKey({ columns: [table.companyId, table.identityId], foreignColumns: [identities.companyId, identities.id] }).onDelete('cascade'),
  index('sessions_company').on(table.companyId),
  index('sessions_expiry').on(table.expiresAt),
]);
export const datasets = pgTable('datasets', {
  companyId: text().notNull().references(() => companies.id, { onDelete: 'cascade' }), key: text().notNull(),
  value: jsonb().$type<unknown[]>().notNull(), version: integer().notNull().default(1),
}, table => [primaryKey({ columns: [table.companyId, table.key] })]);
export const boards = pgTable('boards', {
  companyId: text().notNull().references(() => companies.id, { onDelete: 'cascade' }), key: text().notNull(),
  value: jsonb().$type<unknown[]>().notNull(), version: integer().notNull().default(1),
}, table => [primaryKey({ columns: [table.companyId, table.key] })]);
const bytea = customType<{ data: Buffer; driverData: Buffer }>({ dataType: () => 'bytea' });
export const media = pgTable('media', {
  id: text().primaryKey(), companyId: text().notNull().references(() => companies.id, { onDelete: 'cascade' }),
  digest: text().notNull(), mimeType: text().notNull(), content: bytea().notNull(),
}, table => [uniqueIndex('media_company_digest').on(table.companyId, table.digest)]);
