# Keppler

React, TypeScript and Vite desktop workspace, packaged with Electron.

The app uses Neon PostgreSQL through a server-only Drizzle API. See [NEON_SETUP.md](NEON_SETUP.md) for configuration, migrations, deployment, and tests.

## Development

Use Node.js 24 LTS and npm, then run:

```sh
npm ci
npm run dev:electron
```

Keppler uses the hosted HTTPS API configured in `app-config.json`. No local database, API server, or server credentials are needed to use the desktop app. Closing Electron stops the development server and any explicitly configured local development API. React changes reload automatically; restart after editing the server or Electron's main process.

- `npm run dev`: start the API and Vite for browser development.
- `npm run api:dev`: restart the API automatically after server edits.
- `npm start`: build and run the desktop app locally.
- `npm run lint`: check the source.
- `npm run pack:win`: build an unpacked Windows x64 application.
- `npm run dist:win`: build both Windows x64 executables.
- `npm run test:electron`: smoke-test the packaged app after building, using an isolated temporary profile.

## Share a Windows beta

Run `npm run dist:win` on Windows. The `release/` folder contains:

- `Keppler-0.1.0-beta.1-x64-nsis.exe`: installer with an installation folder picker and desktop shortcut.
- `Keppler-0.1.0-beta.1-x64-portable.exe`: standalone launcher that needs no installation.

Share either executable. Testers do not need Node.js or a local server. Sign-in and cloud operations use the hosted Neon Function over HTTPS; cached startup remains available offline. The `win-unpacked` directory is for testing; its executable cannot be shared alone. Windows builds generate `build/icon.ico` from `public/Logomark with rounded bg.png` and use it for the executable and installer.

Change `version` in `package.json` for the next beta (`npm version 0.1.0-beta.2 --no-git-tag-version` also updates the lockfile). Builds are local and are not uploaded or automatically published. No automatic updater is configured.

These beta builds are unsigned, so Windows may show an unknown-publisher/SmartScreen prompt. Public releases should use a Windows code-signing certificate.

## Data and desktop behavior

Companies, staff, sessions, clients, projects, boards, profile pictures, and uploaded board media are persisted in Neon PostgreSQL. The React app calls an authenticated HTTP API; no database connection string is sent to the renderer. The session bearer token, a cross-window auth notification, and a token-bound snapshot of confirmed company/client/project data are kept locally for immediate startup. Neon remains the source of truth. Board media is uploaded separately and referenced by ID, rather than re-uploaded with every board change. Each upload is limited to 64 MB. Dataset and board writes use versions to reject stale updates from another device.

## Company and staff access

Create a company from Welcome using a unique email and a password of at least eight characters. Company owners sign in with email and password. Add employees on Staff, then click a staff row to view and copy their unique token. Staff sign in with their email and staff token. Emails are normalized and globally unique across company/staff credentials. There is no email verification service.

Staff can access their company's workspace and their personal Settings, edit their own name/email/photo, and sign out. Changing the email keeps the existing staff token bound to the new email. Company owners alone can add staff, view active staff tokens, revoke/restore access, delete staff, and change company credentials. Click a staff row to manage access. Revoking access invalidates every server session and blocks sign-in; restoring access issues a new token. Deleting a staff identity cascades to its sessions and preserves company projects/media. Every data endpoint derives company ownership from the server-validated session.

The server uses salted scrypt password hashes, cryptographically random staff/session tokens, SHA-256 token hashes for lookup, and AES-256-GCM encryption for staff tokens that owners can recover. `TOKEN_ENCRYPTION_KEY` must be private, stable, and backed up. Sessions expire after seven days. Password changes revoke other sessions; owners can sign out every company session across devices.

Existing offline IndexedDB/localStorage data is left untouched and is not automatically uploaded. Previously local accounts must be created in the online system; a deliberate data-import flow would be needed to transfer their old workspaces. The API requires network access. Concurrent live UI updates are not pushed. Sign in again to refresh the client/project list from the server; opening boards, staff, and settings still loads their remote data.

Run `npm run build`, start the API (`npm run dev` or `npm run api:start`), then run `npm run test:electron -- --local`. This drives an isolated Electron profile through signup, staff tokens/copy, client/project creation, search, board/media persistence, staff profile pictures, reload, and sign-out against the configured Neon database. Test records are cleaned up. `npm run test:api` uses disposable in-memory PostgreSQL; `npm run test:neon` runs the API checks against the configured Neon branch and cleans up its test companies.

Routes use URL hashes so navigation and reload work from the packaged HTML file. The renderer has no Node.js access, uses context isolation and sandboxing, and cannot open new windows or navigate to external pages. Inter, Montserrat, and Inder fonts are bundled locally and require no internet connection.

Configuration: `electron/main.cjs`, `electron-builder.json`, and `scripts/electron-dev.mjs`.

References: [Electron security](https://www.electronjs.org/docs/latest/tutorial/security), [Windows installer and portable packaging](https://www.electron.build/nsis/).

UI preference: hide all visible scrollbar tracks while keeping scrolling functional. Inputs should not show browser-default focus rings or outlines.

Invoices: use Invoice on a client row, or New Invoice in the client project panel to pick projects first. Edit company/customer details, upload a company logo, add/remove rows, and enter NGN prices and tax. Download A4 PDF or PNG; long invoices paginate in PDF and include every page in the PNG. Invoice drafts are generated on demand and are not stored after closing. Run `npm run test:invoice` for currency calculation checks; the Electron smoke test also verifies invoice selection and PDF/PNG exports.

Startup opens immediately without an API/session probe. A token-bound local snapshot restores the last confirmed company/client/project data until its session expires; an absent, invalid, or expired snapshot opens Welcome. Sign-in checks the server and times out after 15 seconds on an unresponsive connection. Cloud data operations still contact the API, and rejected/expired server sessions return to sign-in. The snapshot is a display cache; Neon remains the authoritative database.

Run `npm run test:startup` after building to verify offline startup, cached session expiry, and sign-in-only connection errors without contacting Neon.

Keppler uses the public API URL in `app-config.json`. The `kepplerapi` Neon Function runs the same authenticated company/staff routes; the database and encryption key remain server-side. Production Vite builds reject HTTP and localhost endpoints. To test a local API during web development, explicitly set `VITE_API_URL=http://127.0.0.1:3001/api` for `npm run dev`; clear that override before creating a release. Publish API changes with `neon deploy --env .env.local`. `npm run test:function` exercises the Fetch-hosted API adapter, and `node --import tsx scripts/smoke-online-electron.mjs PATH_TO_PACKAGED_EXE --require-remote` runs end-to-end UI tests with localhost requests blocked.

Staff access changes use the nullable `identities.accessRevokedAt` column. The migration and live API tests were validated on an isolated production branch before production rollout. Revocation is enforced by the server on sign-in and every API request; already cached offline display data is not remotely erased. Both settings pages share card layouts, feedback banners, loading states, and input styles.
