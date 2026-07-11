# CatGPT 🐈‍⬛

A personal-use macOS desktop app wrapping **chatgpt.com** in a native-feeling
Electron shell — persistent login, real menus, a global summon key, native
notifications, downloads handling, and **voice mode** (which the web-wrapped
alternatives and "ChatGPT Classic" era apps don't all give you).

Built for macOS 14+ on Apple Silicon. Not affiliated with OpenAI; no OpenAI
branding; it simply displays chatgpt.com under your own login.

## Install (from a release)

1. Download the `.dmg` (or `.zip`) from the repo's Releases page.
2. Drag `CatGPT.app` to `/Applications` (or anywhere).
3. Open it. Releases are Developer-ID signed and notarized, so Gatekeeper
   opens them without ceremony.

## Logging in — READ THIS, it's not obvious

ChatGPT sign-in inside *any* Electron app has one trap: **passkeys cannot
work** (Electron has no bridge to macOS's Touch ID / iCloud Keychain
authenticator). The fix is one click, but you have to know it's there:

1. Click **Log in** → **Continue with Google** (a Google sign-in window opens
   inside the app — that's normal).
2. If Google shows **"Use your passkey to confirm it's really you"** — do
   **NOT** press Continue. It will spin forever; there is no passkey device
   inside an Electron shell.
3. Click **"Try another way"** instead, then pick any of:
   - **"Get a prompt on your phone"** — easiest; tap *Yes* on your iPhone
     (any phone signed into your Google account, e.g. via the Gmail app),
   - an **authenticator app code**,
   - an **SMS code**.
4. You don't need a Google password for any of those — passwordless accounts
   work fine via the phone prompt.

This is **one-time**: the session lives in a persistent partition and
survives quits, reboots, and app rebuilds. Email/password and emailed
one-time-code login also work normally, as does Apple sign-in (same rule:
avoid the passkey screen, use the fallback).

## Voice mode

First use of the microphone triggers the macOS permission prompt — grant it
and you're done. If voice seems deaf and no prompt ever appeared: System
Settings → Privacy & Security → Microphone → enable **CatGPT**.

The camera is deliberately never allowed (microphone only, and only for
chatgpt.com). All other permissions are denied by default.

## Keyboard & behavior

| Action | Key |
| --- | --- |
| Summon / hide CatGPT from anywhere | **⌃⌘G** (configurable) |
| New chat | ⌘N |
| Hide window | ⌘W (bring back: ⌃⌘G, dock click, or right-click dock icon → *Show CatGPT*) |
| Zoom in / out / reset (persists) | ⌘+ / ⌘− / ⌘0 |
| Back / Forward | ⌘[ / ⌘] |
| Reload | ⌘R |

- The red close button hides the window; **⌘Q quits**.
- Downloads go straight to `~/Downloads` (unique names), show progress on the
  dock icon, and reveal in Finder when done.
- ChatGPT's web notifications appear as native macOS notifications; clicking
  one focuses the app.
- External links always open in your default browser — the app never
  navigates away from ChatGPT/OAuth pages.

## Preferences

`~/Library/Application Support/CatGPT/config.json` (edit while the app is
quit; it's read at launch):

- `prefs.globalHotkey` — [Electron accelerator](https://www.electronjs.org/docs/latest/api/accelerator)
  string, default `Control+Command+G`.
- `prefs.updateNag.enabled` — weekly Electron-staleness notice (Phase 3).
- `prefs.cssTweaks` — cosmetic page tweaks (Phase 3).
- Window bounds and zoom level are persisted here automatically.

## Building from source

```bash
npm install
npm start            # dev run (Forge + Vite)
npm run package      # packaged .app → out/CatGPT-darwin-arm64/ (auto-signed)
./scripts/release.sh # notarized release: zip + dmg → GitHub release
```

Notes:

- Packaged builds auto-sign with the owner's Developer ID via a Forge
  postPackage hook (`forge.config.ts`) — building on another machine means
  changing the identity there, or removing the hook (unsigned builds run
  locally but macOS will not grant them the microphone reliably).
- Releasing notarizes via the machine-wide `notary` keychain profile (see
  `scripts/release.sh` for fresh-machine setup).
- Node ≥24.16/26 zip bug in the Electron toolchain is already worked around
  via the `overrides` pin in `package.json` — don't remove it until Forge ≥8.
- Icon: regenerate from the portrait source with
  `./scripts/build-portrait-icon.sh`.
- The product brief lives in `chatgpt-electron-agent-brief.md`; every
  non-obvious decision is logged in `docs/DECISIONS.md`.

## Known limitations

- The dock badge is never *set* for web notifications (Electron exposes no
  main-process event for them); it clears on focus.
- Passkeys can't complete inside the app — platform limitation, see login
  section.
- Don't run the dev instance and the packaged app at once: they share a
  single-instance lock and session (the second one exits immediately).
- Apple Silicon only; no universal binary.
