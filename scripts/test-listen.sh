#!/usr/bin/env bash
# test-listen.sh — automated Listen/background-play verification via log markers.
# Usage: test-listen.sh [--restart] [YOUTUBE_URL]
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
LOG="${HOME}/Library/Application Support/com.colliderli.iina/plugins/.data/com.jarobinson.youtube-safari/youtube-safari.log"
DATA_DIR="${HOME}/Library/Application Support/com.colliderli.iina/plugins/.data/com.jarobinson.youtube-safari"
TEST_URL="${TEST_URL:-https://www.youtube.com/watch?v=oxZeLM9rx7s}"
RESTART=0
CLOSE_ON_EXIT=1
TIMEOUT="${TIMEOUT:-120}"

while [[ $# -gt 0 ]]; do
  case "$1" in
    --restart) RESTART=1; shift ;;
    --keep-iina) CLOSE_ON_EXIT=0; shift ;;
    -*) echo "unknown option: $1" >&2; exit 2 ;;
    *) TEST_URL="$1"; shift ;;
  esac
done

cleanup_test() {
  if [[ "$CLOSE_ON_EXIT" -eq 1 ]]; then
    bash "$ROOT/scripts/close-iina.sh"
  fi
}
trap cleanup_test EXIT

mkdir -p "$DATA_DIR"
touch "$LOG"

LOG_OFFSET=0

log_since() {
  tail -n +"$((LOG_OFFSET + 1))" "$LOG" 2>/dev/null || tail -n 500 "$LOG"
}

wait_for_log() {
  local pattern="$1"
  local scope="${2:-since}"
  local deadline=$((SECONDS + TIMEOUT))
  while (( SECONDS < deadline )); do
    if [[ "$scope" == "tail" ]]; then
      tail -n 80 "$LOG" | rg -q "$pattern" && return 0
    elif log_since | rg -q "$pattern"; then
      return 0
    fi
    sleep 0.5
  done
  return 1
}

restart_iina() {
  echo "==> Restarting IINA…"
  bash "$ROOT/scripts/close-iina.sh" --quiet
  open -a IINA
  echo "==> Waiting for plugin global entry…"
  if ! wait_for_log "Global entry loaded" tail; then
    echo "FAIL: Global entry did not load within ${TIMEOUT}s" >&2
    tail -n 30 "$LOG" >&2 || true
    return 1
  fi
  sleep 1
}

echo "=== test-listen ==="
echo "URL: $TEST_URL"

cd "$ROOT"
echo "==> Building plugin…"
npm run build >/dev/null

if [[ "$RESTART" -eq 1 ]]; then
  restart_iina || exit 1
elif ! pgrep -qx IINA; then
  open -a IINA
  wait_for_log "Global entry loaded" tail || {
    echo "FAIL: IINA started but global entry missing" >&2
    exit 1
  }
fi

LOG_OFFSET="$(wc -l < "$LOG" | tr -d ' ')"
echo "==> Log offset: line $LOG_OFFSET"
printf '{"url":"%s","background":true}' "$TEST_URL" > "$DATA_DIR/open-url.pending"
echo "==> Queued background play"

FAILURES=()

check_marker() {
  local name="$1"
  local pattern="$2"
  if log_since | rg -q "$pattern"; then
    echo "PASS: $name"
    log_since | rg "$pattern" | tail -1
    return 0
  fi
  echo "FAIL: $name (pattern: $pattern)" >&2
  FAILURES+=("$name")
  return 1
}

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