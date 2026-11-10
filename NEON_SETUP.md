# Neon / Drizzle

The app is connected to Neon PostgreSQL through an authenticated Node API. Database access stays in `server/`; React never receives `DATABASE_URL`.

## Linked project

- Organization: `org-lingering-dew-75303567`
- Project: `noisy-bonus-16927633`
- Branch: `production`
- Declared services: PostgreSQL and the `kepplerapi` Neon Function (`neon.ts` retains the existing custom company/staff authentication; managed Neon Auth is disabled).

`neon deploy --env .env.local` provisions declared services and pulls `DATABASE_URL`, `DATABASE_URL_UNPOOLED`, and `NEON_BRANCH` into the Git-ignored `.env.local` (or `.env` if present). The current config also deploys the API as a Neon Function; Electron contains the frontend.

## Local setup

```sh
npm ci
neon login
neon deploy
npm run api:init
npm run db:check
npm run db:migrate
npm run dev
```

- `npm run dev` starts Vite and uses the hosted API by default. An explicit localhost `VITE_API_URL` enables local API development.
- `npm run dev:electron` starts Vite and Electron; the hosted API is used by default.
- `npm start` builds and opens Electron against the hosted API.
- `npm run api:dev` runs the API with server-code watching.
- `npm run api:start` runs only the API.

The CLI-generated variables are loaded from `.env.local` before `.env`. `npm run api:init` generates a private `TOKEN_ENCRYPTION_KEY` if no key is configured. Keep this key stable and back it up: it encrypts recoverable staff tokens. Never commit `.env` or `.env.local`.

The Drizzle node-postgres pool supports interactive transactions. Neon Functions reuse a small module-level pool with `attachDatabasePool` for idle disconnect handling. Application traffic uses pooled `DATABASE_URL`; migration traffic uses direct `DATABASE_URL_UNPOOLED` when available.

## Schema and migrations

- `companies`: company identity and creation date.
- `identities`: normalized globally unique owner/staff emails, owner password hashes, staff token hashes/encrypted tokens, roles, profile pictures, and nullable `accessRevokedAt` for staff access revocation.
- `sessions`: hashed bearer tokens, expiry, and company-bound identity references.
- `datasets`: company-scoped client/project collections and optimistic write versions.
- `boards`: company-scoped board JSON and optimistic write versions.
- `media`: binary image/video uploads, deduplicated within the company by SHA-256 digest. Upload limit: 64 MB per file.

```sh
npm run db:generate   # generate a migration after a schema edit
npm run db:migrate    # apply checked-in migrations
npm run db:check      # validate connection
npm run db:studio    # inspect configured branch
```

Test migrations on an isolated Neon branch before applying them to production. Initial schema validation was performed on a temporary branch of production, which was then deleted after the checks.

## Verification

```sh
npm run build
npm run test:db
npm run test:api
npm run test:neon
# With the API running:
npm run test:electron -- --local
```

`test:db` and `test:api` use disposable in-memory PostgreSQL (PGlite) for tests only. `test:neon` starts a temporary HTTP API connected to the real configured Neon branch; it checks authentication/authorization, encrypted token recovery, company data isolation, stale writes, media upload/download, board persistence, password changes, session expiry, and sign-out. It deletes only companies created by that test. The Electron test drives the actual React UI and performs the same scoped cleanup.

## Hosting and desktop distribution

Alpha 1.1 hosts the API on the production Neon branch as `kepplerapi`:

`https://br-winter-surf-b5db498m-kepplerapi.compute.c-7.us-east-2.aws.neon.tech/api`

The public desktop URL lives in `app-config.json`; React and the startup/test scripts share that setting. No server, database URL, or encryption key is required on the user's computer. The release builder rejects localhost and non-HTTPS API overrides. `npm start` skips local API startup when the hosted URL is selected.

`neon.ts` declares the API source and server-only env. Deploy with `neon deploy --env .env.local` so the existing stable `TOKEN_ENCRYPTION_KEY` is retained. Neon injects its branch database URL into the Function. The Function accepts the Electron `null` origin and enforces the existing company/staff session and ownership checks. It uses a Fetch-to-Express adapter without an HTTP listener on the client or Function. Its auth throttle is conservatively shared per isolate because the Fetch runtime does not supply a trusted TCP peer IP.

`npm run test:function` tests all auth/data routes through that adapter. The packaged Electron smoke test accepts `--require-remote` to block localhost HTTP requests and require observed HTTPS traffic. Releases are written to `release/alpha-1.1`.

Existing local accounts and workspace data remain untouched in the old stores. They are not silently uploaded or migrated; online accounts are separate. The online app stores its session bearer token, an auth-change notification, and a token-bound snapshot of confirmed company/client/project data locally. Startup uses the snapshot without a session/network probe until local expiry; sign-in refreshes that data from the server. Boards, staff, profile/settings updates, and other cloud operations still need the API. There is no live cross-device UI push. Conflicting saves are rejected rather than silently overwriting a newer version.

References: [Drizzle Neon driver](https://orm.drizzle.team/docs/connect-neon), [Neon connection pooling](https://neon.com/docs/connect/connection-pooling).

Staff management: owners can revoke/restore access or delete staff through their row dialog. Revocation deletes staff sessions and blocks both new sign-in and existing-session API access. Restoring rotates the staff token; deleting removes the identity and cascades session deletion. The company, projects, datasets, and media remain intact. Staff may update only their own name, unique normalized email, and photo. The profile endpoint still accepts photo-only updates from previous desktop builds.
