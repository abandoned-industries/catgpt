#!/usr/bin/env bash
# Build assets/CatGPT.icns from the portrait source (owner-picked treatment A:
# floating portrait on the ochre tile). Pipeline: Vision subject-lift removes
# the baked background -> composite on Big Sur tile -> iconset -> icns.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SRC="$ROOT/assets/icon-portrait-source.jpg"
WORK="$ROOT/out/icon-work"
ICONSET="$ROOT/out/CatGPT.iconset"
ICNS="$ROOT/assets/CatGPT.icns"

command -v magick >/dev/null 2>&1 || { echo "error: ImageMagick (magick) required" >&2; exit 1; }
command -v iconutil >/dev/null 2>&1 || { echo "error: macOS iconutil required" >&2; exit 1; }
[[ -f "$SRC" ]] || { echo "error: source not found: $SRC" >&2; exit 1; }

mkdir -p "$WORK"

# 1. Cut the cat out of the baked checkerboard background (real alpha).
xcrun swift "$ROOT/scripts/subject-lift.swift" "$SRC" "$WORK/cat-cutout.png"

# 2. Ochre gradient tile, FULL-CANVAS (1024px, r=230 ≈ Apple's squircle ratio).
# macOS 26 wraps under-filled icons in a gray backplate; a full-bleed rounded
# tile avoids the frame there and still shows proper corners on macOS 14-15.
magick -size 1024x1500 "gradient:#E5A873-#CE8B52" \
  \( -size 1024x1024 xc:none -fill white -draw "roundrectangle 0,0 1023,1023 230,230" \) \
  -gravity north -compose CopyOpacity -composite -crop 1024x1024+0+0 "$WORK/tile1024.png"

# 3. Portrait: cat 900px tall, bottom flush. A soft shadow rises from the
# bottom so the wide flanks blend into the corner curves instead of being
# sliced by them; then clip everything to the rounded tile.
magick "$WORK/cat-cutout.png" -resize x900 "$WORK/cat-a.png"
magick -size 1024x260 "gradient:none-rgba(30,15,4,0.55)" "$WORK/shade.png"
magick "$WORK/tile1024.png" \
  "$WORK/cat-a.png" -gravity south -geometry +0+0 -composite \
  "$WORK/shade.png" -gravity south -geometry +0+0 -composite \
  \( -size 1024x1024 xc:black -fill white -draw "roundrectangle 0,0 1023,1023 230,230" \) \
  -alpha off -compose CopyOpacity -composite "$WORK/icon-1024.png"

# 4. Iconset at every required size, then icns.
rm -rf "$ICONSET"
mkdir -p "$ICONSET"

gen() { magick "$WORK/icon-1024.png" -resize "${1}x${1}" "$ICONSET/$2"; }
gen 16   icon_16x16.png
gen 32   icon_16x16@2x.png
gen 32   icon_32x32.png
gen 64   icon_32x32@2x.png
gen 128  icon_128x128.png
gen 256  icon_128x128@2x.png
gen 256  icon_256x256.png
gen 512  icon_256x256@2x.png
gen 512  icon_512x512.png
cp "$WORK/icon-1024.png" "$ICONSET/icon_512x512@2x.png"

iconutil -c icns "$ICONSET" -o "$ICNS"
echo "Built $ICNS"
