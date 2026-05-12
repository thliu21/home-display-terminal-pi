#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
APP_DIR="${APP_DIR:-$(cd "$SCRIPT_DIR/../.." && pwd)}"
APP_PUBLIC_DIR="${APP_PUBLIC_DIR:-$APP_DIR/public}"
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
exec /usr/bin/python3 "$APP_DIR/scripts/systemd/gpio_server.py"
