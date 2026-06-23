#!/usr/bin/env bash
# close-iina.sh — quit IINA and wait for player/helper processes to exit.
# Usage: close-iina.sh [--quiet]
set -euo pipefail

QUIET=0
while [[ $# -gt 0 ]]; do
  case "$1" in
    --quiet) QUIET=1; shift ;;
    -h|--help)
      echo "usage: close-iina.sh [--quiet]" >&2
      exit 0
      ;;
    *) echo "unknown option: $1" >&2; exit 2 ;;
  esac
done

log() {
  if [[ "$QUIET" -eq 0 ]]; then
    echo "$@"
  fi
}

if ! pgrep -qx IINA; then
  log "==> IINA not running"
  exit 0
fi

log "==> Closing IINA…"
osascript -e 'tell application "IINA" to quit' >/dev/null 2>&1 || true

for _ in $(seq 1 24); do
  pgrep -qx IINA || exit 0
  sleep 0.5
done

log "==> IINA still running — sending SIGTERM…"
killall IINA >/dev/null 2>&1 || true
sleep 1

if pgrep -qx IINA; then
  log "==> IINA still running — sending SIGKILL…"
  killall -9 IINA >/dev/null 2>&1 || true
  sleep 0.5
fi

if pgrep -qx IINA; then
  echo "WARN: IINA process still present after close attempt" >&2
  pgrep -lf IINA >&2 || true
  exit 1
fi

log "==> IINA closed"
exit 0