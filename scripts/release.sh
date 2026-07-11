#!/usr/bin/env bash
# Build, notarize, and publish a CatGPT release.
#
#   ./scripts/release.sh                # full run: package -> notarize -> staple -> zip+dmg -> gh release
#   ./scripts/release.sh --skip-notarize  # escape hatch: unnotarized artifacts (Gatekeeper will fight users)
#
# Notarization uses the MACHINE-WIDE keychain profile "notary" (shared by all
# of Kazys's projects; created once, verified working 2026-07-10). Only on a
# fresh machine: xcrun notarytool store-credentials "notary" \
#   --apple-id kvarnelis@gmail.com --team-id PHCL25Z99X   (interactive password)
set -euo pipefail

PROFILE="${NOTARY_PROFILE:-notary}"
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

VERSION="$(node -p "require('./package.json').version")"
APP="out/CatGPT-darwin-arm64/CatGPT.app"
RELDIR="out/release"
SKIP_NOTARIZE="${1:-}"

echo "==> Packaging v$VERSION (auto-signs via postPackage hook)"
# stdin must stay open or the Forge vite plugin tears the process down (see CLAUDE.md)
npm run package < <(sleep 900)

echo "==> Verifying signature"
codesign --verify --deep --strict "$APP"
# Capture first: pipefail + grep -q races SIGPIPE against codesign's exit.
SIGNATURE_INFO="$(codesign -dv "$APP" 2>&1)"
if ! grep -q "TeamIdentifier=PHCL25Z99X" <<<"$SIGNATURE_INFO"; then
  echo "error: app is not Developer ID signed:" >&2
  echo "$SIGNATURE_INFO" >&2
  exit 1
fi

if [[ "$SKIP_NOTARIZE" == "--skip-notarize" ]]; then
  echo "WARNING: skipping notarization — downloaded copies will hit Gatekeeper" >&2
else
  if ! xcrun notarytool history --keychain-profile "$PROFILE" >/dev/null 2>&1; then
    cat >&2 <<EOF
error: no notarization credentials (keychain profile "$PROFILE").
Run the one-time setup printed at the top of this script, then re-run.
Or pass --skip-notarize to release unnotarized (not recommended).
EOF
    exit 1
  fi
  echo "==> Notarizing (Apple service — typically 1-10 minutes)"
  mkdir -p "$RELDIR"
  NOTARIZE_ZIP="$RELDIR/CatGPT-notarize.zip"
  ditto -c -k --keepParent "$APP" "$NOTARIZE_ZIP"
  xcrun notarytool submit "$NOTARIZE_ZIP" --keychain-profile "$PROFILE" --wait
  rm -f "$NOTARIZE_ZIP"
  echo "==> Stapling ticket"
  xcrun stapler staple "$APP"
  xcrun stapler validate "$APP"
fi

echo "==> Building release artifacts"
mkdir -p "$RELDIR"
ZIP="$RELDIR/CatGPT-$VERSION-arm64.zip"
DMG="$RELDIR/CatGPT-$VERSION-arm64.dmg"
rm -f "$ZIP" "$DMG"
ditto -c -k --keepParent "$APP" "$ZIP"
hdiutil create -volname "CatGPT" -srcfolder "$APP" -ov -format UDZO "$DMG" >/dev/null
echo "    $ZIP"
echo "    $DMG"

echo "==> Creating GitHub release v$VERSION"
gh release create "v$VERSION" "$DMG" "$ZIP" \
  --title "CatGPT $VERSION" \
  --notes "Signed and notarized macOS build (Apple Silicon). See README for install and the login guide (passkeys don't work in-app — use \"Try another way\")."

echo "==> Done: $(gh release view "v$VERSION" --json url -q .url)"
