#!/usr/bin/env bash
set -euo pipefail

PI_HOST="${PI_HOST:-pi@raspberrypi.local}"
APP_DIR="${APP_DIR:-/home/pi/family-display}"
LOCAL_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

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
  "$LOCAL_DIR/" \
  "$PI_HOST:$APP_DIR/"

echo "Installing and starting Family Display service..."
remote "mkdir -p /home/pi/.config/autostart && cp '$APP_DIR/scripts/kiosk/family-display-kiosk.desktop' /home/pi/.config/autostart/family-display-kiosk.desktop && chmod +x '$APP_DIR/scripts/kiosk/start-kiosk.sh' '$APP_DIR/scripts/native/start-gtk-demo.sh' '$APP_DIR/scripts/systemd/start-server.sh' && sudo cp '$APP_DIR/scripts/systemd/family-display.service' /etc/systemd/system/family-display.service && sudo systemctl daemon-reload && sudo systemctl enable family-display.service && sudo systemctl restart family-display.service"

echo "Restarting kiosk browser..."
remote "DISPLAY=:0 XAUTHORITY=/home/pi/.Xauthority nohup '$APP_DIR/scripts/kiosk/start-kiosk.sh' >/tmp/family-display-kiosk.log 2>&1 &"

echo "Done. Family Display deployed and restarted on $PI_HOST."
