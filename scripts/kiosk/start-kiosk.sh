#!/usr/bin/env bash
set -euo pipefail

xset -dpms || true
xset s off || true
xset s noblank || true

CACHE_BUSTER="$(date +%s)"
KIOSK_PROFILE="/home/pi/.cache/family-display-kiosk"
mkdir -p "$KIOSK_PROFILE"

exec chromium-browser \
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
