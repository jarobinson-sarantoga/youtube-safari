#!/usr/bin/env bash
# test-listen.sh — automated Listen/background-play verification via log markers.
# Usage: test-listen.sh [--restart] [YOUTUBE_URL]
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
# shellcheck source=lib/plugin-log.sh
source "$SCRIPT_DIR/lib/plugin-log.sh"
# shellcheck source=lib/iina-test.sh
source "$SCRIPT_DIR/lib/iina-test.sh"

TEST_URL="${TEST_URL:-https://www.youtube.com/watch?v=oxZeLM9rx7s}"
RESTART=0
CLOSE_ON_EXIT=1
TIMEOUT="${TIMEOUT:-120}"
FAILURES=()

while [[ $# -gt 0 ]]; do
  case "$1" in
    --restart) RESTART=1; shift ;;
    --keep-iina) CLOSE_ON_EXIT=0; shift ;;
    -*) echo "unknown option: $1" >&2; exit 2 ;;
    *) TEST_URL="$1"; shift ;;
  esac
done

trap iina_test_cleanup EXIT
plugin_log_init

echo "=== test-listen ==="
echo "URL: $TEST_URL"

cd "$ROOT"
echo "==> Building plugin…"
npm run build >/dev/null

if [[ "$RESTART" -eq 1 ]]; then
  restart_iina || exit 1
else
  ensure_iina_running || exit 1
fi

LOG_OFFSET="$(wc -l < "$PLUGIN_LOG" | tr -d ' ')"
echo "==> Log offset: line $LOG_OFFSET"
printf '{"url":"%s","background":true}' "$TEST_URL" > "$PLUGIN_DATA_DIR/open-url.pending"
echo "==> Queued background play"

echo "==> Waiting for open + drain…"
wait_for_log "Open YouTube URL:.*background" || true
sleep 1

check_marker "open background url" "Open YouTube URL:.*background" || true
check_marker "post or drain watch" "Posted openYouTubeWatch:.*background|Drained pending openYouTubeWatch:.*background|Background play: scheduling hide" || true

echo "==> Waiting for player handler…"
if wait_for_log "Background play: scheduling hide"; then
  echo "PASS: background hide scheduled"
  log_since | rg "Background play: scheduling hide" | tail -1
else
  echo "FAIL: Background play: scheduling hide" >&2
  FAILURES+=("background hide scheduled")
fi

if wait_for_log "Open YouTube in player:"; then
  echo "PASS: open in player"
  log_since | rg "Open YouTube in player:" | tail -1
else
  echo "FAIL: Open YouTube in player" >&2
  FAILURES+=("open in player")
fi

echo "==> Waiting for hide complete (optional)…"
if wait_for_log "Background play: player window hidden"; then
  echo "PASS: player window hidden"
  log_since | rg "Background play: player window hidden" | tail -1
else
  echo "WARN: player window hidden not confirmed (may still be loading)"
fi

echo ""
echo "=== log excerpt since test ==="
log_since | rg -i "Open YouTube|playerReady|Created player|Drained|openYouTubeWatch|Background play|Open YouTube in player|Resolved|Opened:" || true

if ((${#FAILURES[@]} > 0)); then
  echo ""
  echo "RESULT: FAIL (${FAILURES[*]})" >&2
  exit 1
fi

echo "==> Waiting for Resolved/Opened…"
if ! wait_for_log "Opened:"; then
  if log_since | rg -q "ignored during shutdown|on_load aborted"; then
    echo "RESULT: FAIL (playback aborted during shutdown)" >&2
    exit 1
  fi
  echo "RESULT: FAIL (no Opened: — audio likely not playing)" >&2
  exit 1
fi
log_since | rg "Resolved:|Opened:" | tail -2

echo ""
echo "RESULT: PASS"
exit 0
