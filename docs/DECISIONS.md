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
- `module: ESNext` + `moduleResolution: bundler` in tsconfig — required by the
  ESM-only `electron-store` declarations; vite bundles the main process either way.
- OAuth child-window hosts: accounts.google.com, accounts.youtube.com (Google SSO
  hop), appleid.apple.com, idmsa.apple.com. Everything else → system browser.
- Saved window position is dropped (size kept) when it no longer intersects any
  display, so a detached external monitor can't strand the window off-screen.
- In fullscreen the 28px drag strip collapses (view takes the full content area).
- **Google login: passkeys cannot complete inside the app** (Electron has no macOS
  platform-authenticator bridge). Documented fallback per brief pitfall 2b: on the
  passkey screen choose "Try another way" → phone prompt / authenticator / SMS.
  Verified working 2026-07-10; session persists in the partition afterward.
- **Node 26 packaging bug**: `@electron/packager`'s `extract-zip` (yauzl@2) silently
  extracts one file and exits 0 (forge#4277). Fix: npm override
  `extract-zip → npm:@electron-internal/extract-zip@1.0.3`. Remove at Forge ≥8.
- **Packaged app ships from Phase 1** (owner request): `npm run package` →
  `out/CatGPT-darwin-arm64/CatGPT.app`, root symlink `CatGPT.app` for Finder launch.
  Unsigned until Phase 4 (fine locally — no quarantine on locally built bundles).
  Bundle id left at packager default until Phase 4 (`appBundleId` TODO).
