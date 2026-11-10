import './server/env.ts';
import { defineConfig } from 'drizzle-kit';
export default defineConfig({ schema: './server/schema.ts', out: './drizzle', dialect: 'postgresql', dbCredentials: { url: process.env.DATABASE_URL_UNPOOLED ?? process.env.DATABASE_URL ?? '' } });
