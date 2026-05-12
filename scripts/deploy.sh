#!/usr/bin/env bash
set -euo pipefail

PI_HOST="${PI_HOST:-pi@raspberrypi.local}"
LOCAL_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
REMOTE_HOME="${REMOTE_HOME:-$(ssh "$PI_HOST" 'printf %s "$HOME"')}"
APP_DIR="${APP_DIR:-$REMOTE_HOME/family-display}"
SERVICE_FILE="$(mktemp)"
DESKTOP_FILE="$(mktemp)"
trap 'rm -f "$SERVICE_FILE" "$DESKTOP_FILE"' EXIT

sed "s#/home/pi/family-display#$APP_DIR#g" \
  "$LOCAL_DIR/scripts/systemd/family-display.service" > "$SERVICE_FILE"

cat > "$DESKTOP_FILE" <<EOF
[Desktop Entry]
Type=Application
Name=Family Display Kiosk
Exec=$APP_DIR/scripts/kiosk/start-kiosk.sh
Terminal=false
EOF

ssh "$PI_HOST" "mkdir -p '$APP_DIR'"
rsync -av --delete \
  --exclude '.git' \
  --exclude '.DS_Store' \
  --exclude '__pycache__' \
  --exclude '*.pyc' \
  --exclude 'target' \
  "$LOCAL_DIR/" \
  "$PI_HOST:$APP_DIR/"
scp "$SERVICE_FILE" "$PI_HOST:/tmp/family-display.service"
scp "$DESKTOP_FILE" "$PI_HOST:/tmp/family-display-kiosk.desktop"

ssh "$PI_HOST" "mkdir -p '$REMOTE_HOME/.config/autostart' && cp /tmp/family-display-kiosk.desktop '$REMOTE_HOME/.config/autostart/family-display-kiosk.desktop' && chmod +x '$APP_DIR/scripts/kiosk/start-kiosk.sh' '$APP_DIR/scripts/systemd/start-server.sh' && sudo cp /tmp/family-display.service /etc/systemd/system/family-display.service && sudo chmod 644 /etc/systemd/system/family-display.service && sudo systemctl daemon-reload && sudo systemctl enable --now family-display.service && sudo systemctl restart family-display.service"

echo "Deployed to $PI_HOST:$APP_DIR"
