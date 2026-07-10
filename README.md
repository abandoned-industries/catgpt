# CatGPT

A personal-use macOS desktop app wrapping chatgpt.com in a native-feeling Electron
shell — persistent login, native menus, global hotkey, notifications, voice mode.

Status: **Phase 1 (working shell) in progress.** See
`chatgpt-electron-agent-brief.md` for the full brief and `docs/DECISIONS.md` for
the decisions log.

## Dev

- `npm start` — run in dev (Forge + Vite)
- `npm run make` — package (.dmg + zipped .app) into `out/`

Requires macOS 14+ (Apple Silicon), Node 20+. Electron pinned at 43.1.0.
