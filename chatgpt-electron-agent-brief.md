# ChatGPT Desktop — Agent Brief

You are building a best-in-class Electron desktop app that wraps the ChatGPT web app (https://chatgpt.com) for personal use on macOS. The goal is not a naive kiosk wrapper: the app should feel native, stay logged in, integrate with the OS, and be more pleasant to use than a browser tab or the official app.

## Ground rules

1. **Personal use only.** This app is for the owner's own account. Do not build any scraping, response automation, session-token extraction, or multi-account farming. The app displays chatgpt.com in an embedded Chromium view; the user interacts with it normally.
2. **No OpenAI trademark assets.** Design an original app icon and name (working name: `Interlocutor`, changeable). Do not bundle OpenAI logos.
3. **Do not modify or intercept ChatGPT's network traffic.** No request rewriting, no injected API calls. CSS/JS injection is permitted only for cosmetic and ergonomic purposes (see Phase 3).
4. **Staged delivery with verification gates.** Complete each phase, run its verification checklist, and stop for human review before proceeding. Do not skip ahead.
5. When you hit an undocumented behavior (OAuth blocks, Cloudflare challenges, permission prompts), search current sources rather than guessing — this area changes frequently.

## Stack decisions (fixed — do not relitigate)

- **Electron 43.x** (latest stable at project start; verify with `npm view electron version` and pin the exact version in `package.json`).
- **TypeScript** throughout, strict mode.
- **Electron Forge** with the `vite-typescript` template for scaffolding, dev, and packaging. Makers: `@electron-forge/maker-zip` and `@electron-forge/maker-dmg` for macOS.
- **WebContentsView** (not the deprecated `BrowserView`, not `<webview>`) to host chatgpt.com inside a `BaseWindow` or `BrowserWindow`.
- **Update strategy: nag-only.** No auto-updater, no release feed, no signing dependency. The app periodically (weekly, on launch) checks the Electron releases feed (`https://releases.electronjs.org/releases.json`) and, if the pinned major version has fallen out of the supported window or a security release exists for it, shows a non-blocking menu-bar/menu notice: "Shell update available — rebuild recommended." The human rebuilds manually. The check must fail silently offline and be disableable in the preferences file.
- Target: macOS 14+ (Apple Silicon). Universal binary not required.

## Architecture

- Main process owns a single window with a `WebContentsView` loaded on `https://chatgpt.com`, plus a thin local chrome layer only if needed for the draggable titlebar region.
- Window uses `titleBarStyle: 'hiddenInset'` with traffic lights visible; the remote page fills the content area below a slim draggable strip (or overlay drag region via injected CSS `-webkit-app-region: drag` on a safe element — test that this doesn't break site interactions; if it does, fall back to a 28px native drag strip above the view).
- **Session**: use `session.fromPartition('persist:chatgpt')` so login cookies survive restarts. All web content lives in this partition.
- **Preload**: minimal or none for the remote content. `contextIsolation: true`, `nodeIntegration: false`, `sandbox: true` for the ChatGPT view. Never expose Node APIs to remote content.
- State (window bounds, zoom level, preferences) persisted via `electron-store` or a small JSON file in `app.getPath('userData')`.

## Known pitfalls — handle these explicitly

1. **User agent.** The default Electron UA (contains `Electron/x.y.z`) triggers Cloudflare bot challenges and breaks Google OAuth ("This browser or app may not be secure"). Set the session UA to the exact Chrome UA matching the bundled Chromium version, with the `Electron/…` and app-name tokens stripped. Do this via `session.setUserAgent()` before any load.
2. **Google/Apple sign-in.** Even with a clean UA, embedded OAuth can fail. Implement and test: (a) OAuth popups opened via `window.open` must be allowed as child windows within the same session (handle `setWindowOpenHandler` — OAuth domains like `accounts.google.com` and `appleid.apple.com` open as app child windows; everything else opens in the system browser via `shell.openExternal`). (b) If Google login still fails, document the fallback: log in with email/password or one-time code.
3. **Microphone (voice mode).** Handle `session.setPermissionRequestHandler` — allow `media` (audio) requests originating from chatgpt.com only, deny everything else by default. The packaged app needs `NSMicrophoneUsageDescription` in `Info.plist` (set via Forge's `packagerConfig.extendInfo`). Without it the app crashes on mic access.
4. **Notifications.** ChatGPT's web notifications should surface as native macOS notifications. Electron forwards HTML5 notifications automatically, but the permission request must be allowed in the same handler, and the packaged app must be signed for macOS to show them reliably.
5. **External links.** Any navigation off an allowlist (`chatgpt.com`, `chat.openai.com`, `auth.openai.com`, `openai.com`, OAuth provider domains) must be cancelled in `will-navigate`/`setWindowOpenHandler` and sent to the default browser.
6. **Background throttling.** Disable `backgroundThrottling` on the web contents so long-running responses and voice sessions don't stall when the window is unfocused.
7. **Downloads.** Handle `session.on('will-download')`: default to `~/Downloads`, show progress in the dock icon, reveal in Finder on completion.

## Phases

### Phase 1 — Working shell
Scaffold the project; window with persistent session loading chatgpt.com; UA fix; external-link policy; window bounds persistence; single-instance lock; quit/close behavior (close hides the window, Cmd+Q quits — standard macOS pattern).

**Gate 1 (human verifies):** app launches from `npm start`; login (including Google OAuth) succeeds; session survives full quit and relaunch; external links open in the default browser; no console errors from the main process.

### Phase 2 — Native integration
- Full native menu bar: standard Edit menu (so ⌘C/⌘V/⌘A work), View menu with zoom in/out/reset (persisted per-session via `webContents.setZoomLevel`), navigation (back/forward/reload).
- App-level shortcuts mapped to ChatGPT actions where the site exposes them (e.g., ⌘N → new chat, implemented by loading `https://chatgpt.com/` or dispatching the site's own shortcut via `webContents.sendInputEvent` — verify the site's current shortcut map at build time rather than assuming).
- **Global hotkey** (default ⌥Space, configurable in a small preferences JSON): toggles show/hide + focus of the window from anywhere.
- Native notifications and dock badge for background activity.
- Microphone permission flow working end-to-end with voice mode.
- Spellcheck enabled (`spellcheck: true`, system languages).

**Gate 2:** every menu item works; global hotkey summons the app over other fullscreen apps; voice mode records and plays back; a notification fired while the app is hidden appears natively and clicking it focuses the window.

### Phase 3 — Polish
- `nativeTheme` sync: app chrome follows system dark/light; verify chatgpt.com follows its own setting and don't fight it.
- Optional injected CSS (user-toggleable, stored locally): hide upsell banners, tighten sidebar spacing, custom font stack. Keep each tweak as a separate, labeled CSS block so breakage after a site redesign is isolated. Injection via `webContents.insertCSS` on `dom-ready`; must fail silently.
- Menu-bar (tray) item with quick actions: Show/Hide, New Chat, Quit.
- Loading/offline state: a minimal local page shown when chatgpt.com is unreachable, with a retry button — never a white screen.
- App icon (original design), About panel.
- **Update nag**: implement the version-staleness check from Stack decisions. Notice appears in the app menu and as a one-time native notification per stale version; never a modal, never repeated more than weekly.

**Gate 3:** theme switch mid-session behaves; CSS toggles apply/revert live; killing the network shows the offline page and recovery works.

### Phase 4 — Packaging
- Forge `make` produces a `.dmg` and zipped `.app`.
- Code signing with the user's Developer ID if available; otherwise ad-hoc sign and document the Gatekeeper right-click-open flow. Notarization (`@electron/notarize`) only if signing identity exists — ask before configuring, since it needs credentials.
- Hardened runtime entitlements: `com.apple.security.device.audio-input` plus the standard Electron set.
- README: build instructions, configuration file reference, known limitations.

**Gate 4:** the packaged `.app` (not `npm start`) passes every check from Gates 1–3, launched fresh on a machine state without the dev environment.

## Security posture (non-negotiable)

- `contextIsolation: true`, `sandbox: true`, `nodeIntegration: false` on all web contents hosting remote pages.
- Navigation allowlist enforced in the main process, not the renderer.
- No `remote` module, no `webSecurity: false`, no `allowRunningInsecureContent`.
- Preload (if any) exposes nothing beyond what a specific feature requires, via `contextBridge` with an explicit, minimal API.
- Deny-by-default permission handler; log every denied permission request in dev builds.

## Acceptance checklist (final)

- [ ] Login persists across restarts, including after OS reboot
- [ ] Google OAuth works inside the app
- [ ] Voice mode: mic capture and audio playback work in the packaged app
- [ ] Global hotkey toggles the window system-wide
- [ ] External links never open inside the app
- [ ] Notifications appear natively when hidden; clicking focuses the app
- [ ] Zoom level and window bounds persist
- [ ] No Cloudflare challenge loops in normal use
- [ ] Update nag fires when tested against an artificially old pinned version, and stays silent otherwise
- [ ] Packaged app launches clean on macOS 14+ with no dev tooling installed
- [ ] Repo has README, pinned dependencies, and each phase's decisions documented in `DECISIONS.md`
