# Keppler

React, TypeScript and Vite desktop workspace, packaged with Electron.

## Development

Use Node.js 24 LTS and npm, then run:

```sh
npm ci
npm run dev:electron
```

This starts Vite and Electron together. Closing Electron stops the development server. React changes reload automatically; restart the command after editing Electron's main process.

- `npm run dev`: browser-only development.
- `npm start`: build and run the desktop app locally.
- `npm run lint`: check the source.
- `npm run pack:win`: build an unpacked Windows x64 application.
- `npm run dist:win`: build both Windows x64 beta executables.
- `npm run test:electron`: smoke-test the packaged app after building, using an isolated temporary profile.

## Share a Windows beta

Run `npm run dist:win` on Windows. The `release/` folder contains:

- `Keppler-0.1.0-beta.1-x64-nsis.exe`: installer with an installation folder picker and desktop shortcut.
- `Keppler-0.1.0-beta.1-x64-portable.exe`: standalone launcher that needs no installation.

Share either executable. Testers do not need Node.js. The `win-unpacked` directory is for testing; its executable cannot be shared alone. Builds use Electron's default icon until a Windows `.ico` is supplied in the builder configuration.

Change `version` in `package.json` for the next beta (`npm version 0.1.0-beta.2 --no-git-tag-version` also updates the lockfile). Builds are local and are not uploaded or automatically published. No automatic updater is configured.

These beta builds are unsigned, so Windows may show an unknown-publisher/SmartScreen prompt. Public releases should use a Windows code-signing certificate.

## Data and desktop behavior

Clients and projects use localStorage; board media uses IndexedDB in Electron's persistent user profile under `%APPDATA%/Keppler`. The portable launcher also stores data there, rather than beside the executable. Browser development uses separate storage; existing browser data is not automatically migrated. Uninstalling keeps the profile data.

Routes use URL hashes so navigation and reload work from the packaged HTML file. The renderer has no Node.js access, uses context isolation and sandboxing, and cannot open new windows or navigate to external pages. Google Fonts needs an internet connection; the UI uses fallback fonts offline.

Configuration: `electron/main.cjs`, `electron-builder.json`, and `scripts/electron-dev.mjs`.

References: [Electron security](https://www.electronjs.org/docs/latest/tutorial/security), [Windows installer and portable packaging](https://www.electron.build/nsis/).
