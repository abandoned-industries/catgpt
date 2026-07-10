# CatGPT — project instructions

Electron wrapper for chatgpt.com (macOS 14+, Apple Silicon). The product brief is
`chatgpt-electron-agent-brief.md` at the repo root — it is the source of truth for
scope, phases, pitfalls, and the security posture. Decisions log: `docs/DECISIONS.md`.

## Build outputs (canonical)

- Canonical build/package output: `out/` (Electron Forge default). No other build
  directories, ever; `out/` is the only gitignored build path.
- Dev run: `npm start` (Forge + Vite). Package: `npm run make` → artifacts in
  `out/make/`, app bundle under `out/CatGPT-darwin-arm64/`.
- The repo root keeps a `CatGPT.app` symlink → `out/CatGPT-darwin-arm64/CatGPT.app`
  (Finder-launchable, per the ~/Developer symlink rule). `npm run package` refreshes
  the product; the symlink path is stable. If the packaged path ever changes, update
  the symlink in the same commit.
- Dev instance and packaged app share userData (login persists across both) and a
  single-instance lock — never run them simultaneously; the second exits at once.

## Phase gates (hard rule)

Work proceeds in the brief's phases. Each phase ends at a human verification gate:
STOP after completing a phase and wait for Kazys to run the gate checklist. Never
begin the next phase without explicit approval.

## Dev notes (hard-won, do not rediscover)

- The Forge vite plugin names the main bundle after the entry file:
  `src/main/index.ts` → `.vite/build/index.js`. package.json `"main"` must match,
  or Electron dies with "Unable to find Electron app".
- `electron-forge start` tears down (exit 0, before launching Electron) when stdin
  hits EOF — background/scripted launches must hold stdin open, e.g.
  `tail -f /dev/null | npm start`. Interactive terminal runs are unaffected.
- Node ≥24.16/26: `extract-zip → yauzl@2` silently truncates the Electron zip and
  packaging exits 0 with no `out/` (forge#4277, electron#51619). Fixed by the
  package.json `overrides` pin to `@electron-internal/extract-zip` — keep it until
  the project moves to Forge ≥8 stable, then drop it.

## Security posture

`contextIsolation: true`, `sandbox: true`, `nodeIntegration: false` on all web
contents hosting remote pages; navigation allowlist enforced in the main process;
deny-by-default permission handler with dev-build logging. No exceptions — full
list in the brief's "Security posture" section.

## Runtime AI policy

This app embeds the ChatGPT web UI under the owner's own login. It must never call
metered LLM APIs or store API keys (see ~/Developer/CLAUDE.md).
