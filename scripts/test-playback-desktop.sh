#!/usr/bin/env bash
# test-playback-desktop.sh — restart IINA, open a watch URL, verify resolve/open logs.
# Usage: test-playback-desktop.sh [YOUTUBE_URL]
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
# shellcheck source=lib/plugin-log.sh
source "$SCRIPT_DIR/lib/plugin-log.sh"
# shellcheck source=lib/iina-test.sh
source "$SCRIPT_DIR/lib/iina-test.sh"

URL="${1:-https://www.youtube.com/watch?v=MP3hNCrZlk8}"
TIMEOUT="${TIMEOUT:-120}"
CLOSE_ON_EXIT=1

while [[ $# -gt 0 ]]; do
  case "$1" in
    --keep-iina) CLOSE_ON_EXIT=0; shift ;;
    --timeout) TIMEOUT="${2:-120}"; shift 2 ;;
    http*) URL="$1"; shift ;;
    *) shift ;;
  esac
done

trap iina_test_cleanup EXIT

echo "==> Installing plugin"
bash "$ROOT/scripts/install.sh"

echo "==> Restarting IINA"
restart_iina

plugin_log_init
LOG_OFFSET="$(wc -l < "$PLUGIN_LOG" | tr -d ' ')"
echo "==> Opening URL: $URL"
bash "$ROOT/scripts/open-url.sh" "$URL"

echo "==> Waiting for playback (Resolved/Opened)…"
if wait_for_log_since "Opened:" "Extraction error|Extraction returned|script not found|plugin-root marker"; then
  echo "PASS: stream opened"
  log_tail_since | rg "Resolv|Opened|on_load hook" | tail -5
  exit 0
fi

if log_tail_since | rg -q "Extraction error|Extraction returned|script not found|plugin-root marker"; then
  echo "FAIL: extraction error" >&2
  log_tail_since | rg "on_load|Resolv|Extraction|script not found|plugin-root|Missing" | tail -15 >&2
  exit 1
fi

echo "FAIL: timed out after ${TIMEOUT}s" >&2
log_tail_since | tail -20 >&2
exit 1
