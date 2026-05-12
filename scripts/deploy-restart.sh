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

remote() {
  ssh "$PI_HOST" "$1"
}

echo "Stopping Family Display on $PI_HOST..."
remote "sudo systemctl stop family-display.service || true; pkill -TERM chromium || true; sleep 2; pkill -KILL chromium || true"

echo "Deploying files to $PI_HOST:$APP_DIR..."
remote "mkdir -p '$APP_DIR'"
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

echo "Installing and starting Family Display service..."
remote "mkdir -p '$REMOTE_HOME/.config/autostart' && cp /tmp/family-display-kiosk.desktop '$REMOTE_HOME/.config/autostart/family-display-kiosk.desktop' && chmod +x '$APP_DIR/scripts/kiosk/start-kiosk.sh' '$APP_DIR/scripts/systemd/start-server.sh' && sudo cp /tmp/family-display.service /etc/systemd/system/family-display.service && sudo chmod 644 /etc/systemd/system/family-display.service && sudo systemctl daemon-reload && sudo systemctl enable family-display.service && sudo systemctl restart family-display.service"

echo "Restarting kiosk browser..."
remote "DISPLAY=:0 XAUTHORITY='$REMOTE_HOME/.Xauthority' nohup '$APP_DIR/scripts/kiosk/start-kiosk.sh' >/tmp/family-display-kiosk.log 2>&1 &"

echo "Done. Family Display deployed and restarted on $PI_HOST."
