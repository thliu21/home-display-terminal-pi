#!/usr/bin/env bash
set -euo pipefail

APP_PUBLIC_DIR="/home/pi/family-display/public"
IP_ADDRESS=""

for _ in {1..30}; do
  IP_ADDRESS="$(hostname -I | awk '{print $1}')"
  if [ -n "$IP_ADDRESS" ]; then
    break
  fi
  sleep 1
done

cat > "$APP_PUBLIC_DIR/device-info.js" <<EOF
window.FAMILY_DISPLAY_DEVICE = {
  ipAddress: "$IP_ADDRESS"
};
EOF

cd "$APP_PUBLIC_DIR"
exec /usr/bin/python3 /home/pi/family-display/scripts/systemd/gpio_server.py
