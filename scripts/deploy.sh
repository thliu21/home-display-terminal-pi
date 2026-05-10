#!/usr/bin/env bash
set -euo pipefail

PI_HOST="${PI_HOST:-pi@raspberrypi.local}"
APP_DIR="${APP_DIR:-/home/pi/family-display}"
LOCAL_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

ssh "$PI_HOST" "mkdir -p '$APP_DIR'"
rsync -av --delete \
  --exclude '.git' \
  --exclude '.DS_Store' \
  "$LOCAL_DIR/" \
  "$PI_HOST:$APP_DIR/"

ssh "$PI_HOST" "mkdir -p /home/pi/.config/autostart && cp '$APP_DIR/scripts/kiosk/family-display-kiosk.desktop' /home/pi/.config/autostart/family-display-kiosk.desktop && chmod +x '$APP_DIR/scripts/kiosk/start-kiosk.sh' '$APP_DIR/scripts/systemd/start-server.sh' && sudo cp '$APP_DIR/scripts/systemd/family-display.service' /etc/systemd/system/family-display.service && sudo systemctl daemon-reload && sudo systemctl enable --now family-display.service && sudo systemctl restart family-display.service"

echo "Deployed to $PI_HOST:$APP_DIR"
