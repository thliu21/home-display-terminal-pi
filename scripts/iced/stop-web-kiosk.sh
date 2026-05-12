#!/usr/bin/env bash
set -euo pipefail

PI_HOST="${PI_HOST:-}"
SERVICE_NAME="${SERVICE_NAME:-family-display.service}"

stop_commands="sudo systemctl stop '$SERVICE_NAME' || true; pkill -TERM chromium || true; pgrep -f '[f]amily-display-iced-demo' | xargs -r kill -TERM || true; sleep 2; pkill -KILL chromium || true; pgrep -f '[f]amily-display-iced-demo' | xargs -r kill -KILL || true"

if [ -n "$PI_HOST" ]; then
  echo "Stopping web kiosk on $PI_HOST..."
  ssh "$PI_HOST" "$stop_commands"
else
  echo "Stopping local web kiosk service..."
  eval "$stop_commands"
fi

echo "Web kiosk stopped."
