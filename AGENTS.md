# CatGPT — agent instructions (Codex)

Read `chatgpt-electron-agent-brief.md` (repo root) before any work — it defines
scope, phases, known pitfalls, and the security posture. Project specifics live in
`CLAUDE.md` (same rules, Claude-facing). Log durable decisions in `docs/DECISIONS.md`.

Rules that most often bite:

- Electron is pinned exactly (no caret). TypeScript strict mode. `WebContentsView`,
  never the deprecated `BrowserView` or `<webview>`.
- Security posture is non-negotiable: `contextIsolation: true`, `sandbox: true`,
  `nodeIntegration: false` for anything hosting remote content; no preload for the
  remote view; navigation allowlist enforced in the main process; deny-by-default
  permission handler.
- Build outputs only in `out/` (Forge default). Never create ad-hoc build dirs.
- Verify your work with `npx tsc --noEmit`. Do NOT launch the app (`npm start`) —
  the orchestrating session runs launch verification.
- Phase gates: implement only the phase you were briefed on; never start the next.
