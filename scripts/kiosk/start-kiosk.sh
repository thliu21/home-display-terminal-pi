#!/usr/bin/env bash
set -euo pipefail

xset -dpms || true
xset s off || true
xset s noblank || true

CACHE_BUSTER="$(date +%s)"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
APP_DIR="${APP_DIR:-$(cd "$SCRIPT_DIR/../.." && pwd)}"
KIOSK_PROFILE="${XDG_CACHE_HOME:-$HOME/.cache}/family-display-kiosk"
mkdir -p "$KIOSK_PROFILE"

CHROMIUM_BIN="$(command -v chromium-browser || command -v chromium)"

exec "$CHROMIUM_BIN" \
  --user-data-dir="$KIOSK_PROFILE" \
  --no-first-run \
  --disable-restore-session-state \
  --kiosk \
  --disable-gpu \
  --noerrdialogs \
  --disable-infobars \
  --disable-session-crashed-bubble \
  --check-for-update-interval=31536000 \
  "http://localhost:3000/?kiosk=$CACHE_BUSTER"
