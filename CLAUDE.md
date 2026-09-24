# Net Worth Tracker

Obsidian plugin to track net worth, accounts, and budget over time, right inside the user's vault. Early scaffold — see `ideas.md` (local, untracked) for the feature backlog.

## Stack

TypeScript, esbuild (bundles `main.ts` -> `main.js`, CJS, `obsidian`/`electron`/CodeMirror externalized), Vitest for tests.

## Commands

- `make install` — npm install
- `make dev` — esbuild in watch mode, unminified with sourcemaps
- `make build` — typecheck (`tsc -noEmit`) then minified production build
- `make typecheck` — `tsc -noEmit -skipLibCheck`
- `make test` / `make test-watch` — vitest
- `make release` — interactive: bump version in `manifest.json`/`package.json`/`versions.json`, build, test, commit, tag, push, watch CI, publish the GitHub release

Or run the underlying `npm run <script>` / `npx vitest` directly.

## Structure

- `main.ts` — plugin entry point (`Plugin` subclass), registered in `manifest.json` by `id`
- `tests/` — Vitest specs, mirroring the root `.ts` files they cover
- `styles.css` — plugin styles, loaded automatically by Obsidian
- `.github/workflows/release.yml` — on tag push, builds, tests, verifies the tag matches `manifest.json` version, and drafts a GitHub release with `main.js`/`manifest.json`/`styles.css`
- `scripts/release.sh` — driven by `make release`

## Conventions

Follow the patterns in the sibling plugin `../obs-stock-valuations` (same author, same toolchain) unless this project's needs diverge:

- Keep pure logic (calculations, formatting, data transforms) in standalone modules separate from `main.ts` and Obsidian-view code, so it can be unit tested without mocking the Obsidian API.
- Persisted data shape changes go through an explicit schema version + migration function, not silent reshaping.
- No comments explaining *what* code does; only *why*, for non-obvious constraints or workarounds.
