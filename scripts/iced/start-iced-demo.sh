#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
APP_DIR="${APP_DIR:-$(cd "$SCRIPT_DIR/../.." && pwd)}"
RUN_NICE="${RUN_NICE:-10}"
CPU_CORES="${CPU_CORES:-}"
CARGO_BUILD_JOBS="${CARGO_BUILD_JOBS:-}"
DISPLAY="${DISPLAY:-:0}"
XAUTHORITY="${XAUTHORITY:-$HOME/.Xauthority}"

if [ -f "$HOME/.cargo/env" ]; then
  # shellcheck disable=SC1091
  . "$HOME/.cargo/env"
fi
if [ -z "$CARGO_BUILD_JOBS" ]; then
  unset CARGO_BUILD_JOBS
fi

cd "$APP_DIR/iced-demo"
BINARY="$APP_DIR/iced-demo/target/release/family-display-iced-demo"

export DISPLAY XAUTHORITY

run_cmd() {
  if [ -n "$CPU_CORES" ]; then
    exec taskset -c "$CPU_CORES" nice -n "$RUN_NICE" "$@"
  fi

  exec nice -n "$RUN_NICE" "$@"
}

if [ -x "$BINARY" ]; then
  run_cmd "$BINARY"
fi

if [ -n "${CARGO_BUILD_JOBS:-}" ]; then
  run_cmd env CARGO_BUILD_JOBS="$CARGO_BUILD_JOBS" cargo run --release -j "$CARGO_BUILD_JOBS"
fi

run_cmd cargo run --release
