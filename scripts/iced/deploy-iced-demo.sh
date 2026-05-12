#!/usr/bin/env bash
set -euo pipefail

PI_HOST="${PI_HOST:-pi@raspberrypi.local}"
CPU_CORES="${CPU_CORES:-}"
CARGO_BUILD_JOBS="${CARGO_BUILD_JOBS:-}"
RUN_NICE="${RUN_NICE:-10}"
LOCAL_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
REMOTE_HOME="${REMOTE_HOME:-$(ssh "$PI_HOST" 'printf %s "$HOME"')}"
APP_DIR="${APP_DIR:-$REMOTE_HOME/family-display}"

remote() {
  ssh "$PI_HOST" "$1"
}

echo "Preparing Rust/Iced demo directories on $PI_HOST..."
remote "mkdir -p '$APP_DIR/iced-demo/src' '$APP_DIR/iced-demo/data' '$APP_DIR/public/data' '$APP_DIR/public/assets/fonts' '$APP_DIR/public/assets' '$APP_DIR/scripts/iced'"

echo "Copying Rust/Iced demo files..."
scp \
  "$LOCAL_DIR/iced-demo/Cargo.toml" \
  "$LOCAL_DIR/iced-demo/Cargo.lock" \
  "$PI_HOST:$APP_DIR/iced-demo/"
scp "$LOCAL_DIR"/iced-demo/src/*.rs "$PI_HOST:$APP_DIR/iced-demo/src/"
scp "$LOCAL_DIR/iced-demo/data/weather-fixture.json" "$PI_HOST:$APP_DIR/iced-demo/data/weather-fixture.json"
scp "$LOCAL_DIR/public/app-config.js" "$PI_HOST:$APP_DIR/public/app-config.js"
scp "$LOCAL_DIR/public/data/calendar-events.json" "$PI_HOST:$APP_DIR/public/data/calendar-events.json"
scp "$LOCAL_DIR/public/data/caltrain-commute.csv" "$PI_HOST:$APP_DIR/public/data/caltrain-commute.csv"
scp "$LOCAL_DIR/public/assets/fonts/GoogleSans-Variable.ttf" "$PI_HOST:$APP_DIR/public/assets/fonts/GoogleSans-Variable.ttf"
scp -r "$LOCAL_DIR/public/assets/weather-icons" "$PI_HOST:$APP_DIR/public/assets/"
scp "$LOCAL_DIR/scripts/iced/start-iced-demo.sh" "$LOCAL_DIR/scripts/iced/stop-web-kiosk.sh" "$LOCAL_DIR/scripts/iced/deploy-iced-demo.sh" "$PI_HOST:$APP_DIR/scripts/iced/"

if [ -n "$CPU_CORES" ] || [ -n "$CARGO_BUILD_JOBS" ]; then
  echo "Building on Pi with CPU_CORES='${CPU_CORES:-all}' and CARGO_BUILD_JOBS='${CARGO_BUILD_JOBS:-cargo default}'..."
else
  echo "Building on Pi without CPU or cargo job limits..."
fi
remote "chmod +x '$APP_DIR/scripts/iced/start-iced-demo.sh' '$APP_DIR/scripts/iced/stop-web-kiosk.sh'; CPU_CORES='$CPU_CORES' CARGO_BUILD_JOBS='$CARGO_BUILD_JOBS' RUN_NICE='$RUN_NICE' APP_DIR='$APP_DIR' bash -lc 'set -euo pipefail; if [ -z \"\$CARGO_BUILD_JOBS\" ]; then unset CARGO_BUILD_JOBS; fi; if [ -f ~/.cargo/env ]; then source ~/.cargo/env; fi; cd \"\$APP_DIR/iced-demo\"; if [ -n \"\$CPU_CORES\" ] && [ -n \"\${CARGO_BUILD_JOBS:-}\" ]; then taskset -c \"\$CPU_CORES\" nice -n \"\$RUN_NICE\" cargo build --release -j \"\$CARGO_BUILD_JOBS\"; elif [ -n \"\$CPU_CORES\" ]; then taskset -c \"\$CPU_CORES\" nice -n \"\$RUN_NICE\" cargo build --release; elif [ -n \"\${CARGO_BUILD_JOBS:-}\" ]; then nice -n \"\$RUN_NICE\" cargo build --release -j \"\$CARGO_BUILD_JOBS\"; else nice -n \"\$RUN_NICE\" cargo build --release; fi'"

echo "Stopping web kiosk before launching Rust/Iced demo..."
remote "PI_HOST= '$APP_DIR/scripts/iced/stop-web-kiosk.sh'"

echo "Launching Rust/Iced demo on $PI_HOST..."
remote "DISPLAY=:0 XAUTHORITY='$REMOTE_HOME/.Xauthority' CPU_CORES='$CPU_CORES' CARGO_BUILD_JOBS='$CARGO_BUILD_JOBS' RUN_NICE='$RUN_NICE' APP_DIR='$APP_DIR' nohup '$APP_DIR/scripts/iced/start-iced-demo.sh' >/tmp/family-display-iced-demo.log 2>&1 &"

echo "Done. Log: /tmp/family-display-iced-demo.log"
