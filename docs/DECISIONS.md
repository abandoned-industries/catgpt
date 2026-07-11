# Decisions log

## Trust posture (2026-07-11, owner-approved)

- Audit trail = open source + notarized identity + README "Trust &
  verification" (verify commands) + SHA256SUMS on releases. A View→"Show
  Address" read-only domain display is queued for Phase 3. A local navigation
  log was considered and rejected (conflicts with the collects-nothing story).
- Login guide documents the double passkey wall (Google's, then OpenAI's
  post-SSO) from owner field-testing; only Google sign-in is tested.

## Release v0.1.0 (2026-07-10, owner-directed)

- Phase order amended by owner: release pipeline (Phase 4 scope) built before
  Phase 3. Phase 3 remains queued behind the rest of Gate 2.
- **Notarization decision reversed for released artifacts** (was: sign-only).
  GitHub downloads carry the quarantine flag and modern Gatekeeper removed the
  right-click bypass, so releases must be notarized. Local builds stay fine
  unnotarized. Credentials: the machine-wide notarytool keychain profile
  `notary` (predates this project; shared across all of Kazys's apps) — the
  app-specific password lives only in the keychain, never in the repo.
- Release artifacts come from `scripts/release.sh` (package → notarize →
  staple → ditto zip + hdiutil dmg → `gh release create`). Forge makers are
  NOT used for macOS releases — notarization has to happen between packaging
  and artifact creation, which the maker flow doesn't accommodate cleanly.

## Phase 2 (2026-07-10)

- **Icon final: raster portrait, treatment A** (owner-picked). Owner generated a
  painted portrait in ChatGPT (assets/icon-portrait-source.jpg, background baked
  in); Vision subject-lift (scripts/subject-lift.swift) cuts real alpha; treatment
  A composites it floating on the ochre tile. Regenerate with
  scripts/build-portrait-icon.sh. The vector icon (assets/icon.svg +
  scripts/render-icon.sh) is RETIRED but kept for history/tweaks.
- **Voice-mode audio**: stutter + slight self-hearing judged within normal
  variance after signing fix (not AirPods). Baseline test if it recurs: same
  session in Safari; only chase shell-side audio flags if CatGPT is clearly worse.

- **Gate 1 passed** (owner-verified): Google OAuth via non-passkey factor, session
  persistence across relaunches, external links → default browser.
- New Chat (⌘N) = deterministic `loadURL('https://chatgpt.com/')`, NOT synthesized
  site shortcuts — the site's shortcut map changes without notice.
- Camera stays denied: `media` allowed only when the request is audio-only, and
  only for https://chatgpt.com. Notifications allowed for the same single origin.
- **Dock badge deviation**: Electron has no main-process event for page-generated
  HTML5 notifications, so badge-SETTING is unimplemented (documented in index.ts);
  badge clearing on focus works. Revisit only if Electron adds such an event.
- Downloads: no save dialog (straight to ~/Downloads with unique naming), dock
  progress aggregates simultaneous downloads, Finder reveal on completion per brief.

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
- **Icon** (pulled forward from Phase 3, owner request): owner's ChatGPT-generated
  waving-cat concept (assets/icon-concept.png) vectorized by Codex into
  assets/icon.svg (labeled groups per feature; ochre tile). Regenerate previews and
  assets/CatGPT.icns with scripts/render-icon.sh. Wired via packagerConfig.icon.
- **Packaged app ships from Phase 1** (owner request): `npm run package` →
  `out/CatGPT-darwin-arm64/CatGPT.app`, root symlink `CatGPT.app` for Finder launch.
  Unsigned until Phase 4 (fine locally — no quarantine on locally built bundles).
  Bundle id left at packager default until Phase 4 (`appBundleId` TODO).
