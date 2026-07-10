# Decisions log

## Project start (2026-07-10)

- App name: **CatGPT** (owner decision; brief's working name "Interlocutor" dropped).
  Original cat icon in Phase 3; no OpenAI trademark assets anywhere.
- Electron pinned **43.1.0** — latest stable at project start, verified via
  `npm view electron version` per the brief.
- Electron Forge 7.x, `vite-typescript` template; makers: `maker-zip` + `maker-dmg`.
- Phase 4 signing: Developer ID Application (team PHCL25Z99X), hardened runtime,
  **no notarization** — owner decision; the app is built locally so it never carries
  a quarantine attribute. Revisit only if a .dmg is ever distributed.
- Update strategy: nag-only per brief. No auto-updater, no release feed dependency.

## Phase 1

- Drag region: native drag strip in the window's local chrome layer (the brief's
  sanctioned fallback) instead of injecting `-webkit-app-region: drag` into
  chatgpt.com's DOM — the remote DOM is unstable and injection risks breaking site
  interactions. Revisit during Phase 3 polish if the strip feels heavy.
