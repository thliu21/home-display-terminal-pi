#!/usr/bin/env bash
set -euo pipefail

APP_DIR="${APP_DIR:-/home/pi/family-display}"

export DISPLAY="${DISPLAY:-:0}"
export XAUTHORITY="${XAUTHORITY:-/home/pi/.Xauthority}"

exec /usr/bin/python3 "$APP_DIR/native/gtk_demo.py"
