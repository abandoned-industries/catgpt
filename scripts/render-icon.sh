#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SVG_PATH="$ROOT_DIR/assets/icon.svg"
PREVIEW_DIR="$ROOT_DIR/out/icon-preview"
ICONSET_DIR="$ROOT_DIR/out/CatGPT.iconset"
ICNS_PATH="$ROOT_DIR/assets/CatGPT.icns"

if [[ ! -f "$SVG_PATH" ]]; then
  echo "error: SVG source not found: $SVG_PATH" >&2
  exit 1
fi

if command -v rsvg-convert >/dev/null 2>&1; then
  RENDERER="rsvg"
elif command -v magick >/dev/null 2>&1; then
  RENDERER="magick"
else
  echo "error: rendering requires either rsvg-convert or ImageMagick's magick command" >&2
  exit 1
fi

render_png() {
  local size="$1"
  local destination="$2"

  if [[ "$RENDERER" == "rsvg" ]]; then
    rsvg-convert --width "$size" --height "$size" --output "$destination" "$SVG_PATH"
  else
    magick -background none "$SVG_PATH" -resize "${size}x${size}" -depth 8 \
      -define png:color-type=6 "$destination"
  fi
}

render_preview() {
  mkdir -p "$PREVIEW_DIR"
  local size
  for size in 16 32 64 128 256 512 1024; do
    render_png "$size" "$PREVIEW_DIR/icon-${size}.png"
  done
  echo "Rendered previews to $PREVIEW_DIR"
}

render_icns() {
  if ! command -v iconutil >/dev/null 2>&1; then
    echo "error: icns mode requires macOS iconutil" >&2
    exit 1
  fi

  rm -rf "$ICONSET_DIR"
  mkdir -p "$ICONSET_DIR"

  render_png 16 "$ICONSET_DIR/icon_16x16.png"
  render_png 32 "$ICONSET_DIR/icon_16x16@2x.png"
  render_png 32 "$ICONSET_DIR/icon_32x32.png"
  render_png 64 "$ICONSET_DIR/icon_32x32@2x.png"
  render_png 128 "$ICONSET_DIR/icon_128x128.png"
  render_png 256 "$ICONSET_DIR/icon_128x128@2x.png"
  render_png 256 "$ICONSET_DIR/icon_256x256.png"
  render_png 512 "$ICONSET_DIR/icon_256x256@2x.png"
  render_png 512 "$ICONSET_DIR/icon_512x512.png"
  render_png 1024 "$ICONSET_DIR/icon_512x512@2x.png"

  iconutil -c icns "$ICONSET_DIR" -o "$ICNS_PATH"
  echo "Built $ICNS_PATH"
}

case "${1:-}" in
  preview)
    render_preview
    ;;
  icns)
    render_icns
    ;;
  *)
    echo "usage: $(basename "$0") {preview|icns}" >&2
    exit 2
    ;;
esac
