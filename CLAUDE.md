# CatGPT — project instructions

Electron wrapper for chatgpt.com (macOS 14+, Apple Silicon). The product brief is
`chatgpt-electron-agent-brief.md` at the repo root — it is the source of truth for
scope, phases, pitfalls, and the security posture. Decisions log: `docs/DECISIONS.md`.

## Build outputs (canonical)

- Canonical build/package output: `out/` (Electron Forge default). No other build
  directories, ever; `out/` is the only gitignored build path.
- Dev run: `npm start` (Forge + Vite). Package: `npm run make` → artifacts in
  `out/make/`, app bundle under `out/CatGPT-darwin-arm64/`.
- From Phase 4 on, the repo root keeps a `CatGPT.app` symlink pointing at the
  packaged app in `out/` — if the packaged path changes, update the symlink in the
  same commit.

## Phase gates (hard rule)

Work proceeds in the brief's phases. Each phase ends at a human verification gate:
STOP after completing a phase and wait for Kazys to run the gate checklist. Never
begin the next phase without explicit approval.

## Security posture

`contextIsolation: true`, `sandbox: true`, `nodeIntegration: false` on all web
contents hosting remote pages; navigation allowlist enforced in the main process;
deny-by-default permission handler with dev-build logging. No exceptions — full
list in the brief's "Security posture" section.

## Runtime AI policy

This app embeds the ChatGPT web UI under the owner's own login. It must never call
metered LLM APIs or store API keys (see ~/Developer/CLAUDE.md).
