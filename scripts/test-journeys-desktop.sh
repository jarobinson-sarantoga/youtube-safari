#!/usr/bin/env bash
# test-journeys-desktop.sh — Critical YouTube plugin user journeys via agent-desktop.
# Usage: test-journeys-desktop.sh [--keep-iina]
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
TIMEOUT="${TIMEOUT:-120}"
CLOSE_ON_EXIT=1

while [[ $# -gt 0 ]]; do
  case "$1" in
    --keep-iina) CLOSE_ON_EXIT=0; shift ;;
    *) shift ;;
  esac
done

# shellcheck source=scripts/lib/plugin-log.sh
source "$ROOT/scripts/lib/plugin-log.sh"
# shellcheck source=scripts/lib/journeys-log.sh
source "$ROOT/scripts/lib/journeys-log.sh"
# shellcheck source=scripts/lib/journeys-panel.sh
source "$ROOT/scripts/lib/journeys-panel.sh"
# shellcheck source=scripts/lib/journeys-feed.sh
source "$ROOT/scripts/lib/journeys-feed.sh"

cleanup_test() {
  if [[ "$CLOSE_ON_EXIT" -eq 1 ]]; then
    bash "$ROOT/scripts/close-iina.sh"
  fi
}
trap cleanup_test EXIT

fail() {
  echo "FAIL: $1" >&2
  exit 1
}

pass() {
  echo "PASS: $1"
}

command -v agent-desktop >/dev/null || fail "agent-desktop not installed"

perm_state() {
  agent-desktop permissions 2>/dev/null | rg -o '"accessibility":\{"state":"[^"]+"' | rg -o 'granted|denied|unknown' | head -1
}

[[ "$(perm_state)" == "granted" ]] || fail "agent-desktop accessibility not granted"

echo "==> Journey 0: open panel + wait for feed"
LOG_OFFSET="$(wc -l < "$LOG" | tr -d ' ')"
open_panel
wait_feed_rows 3
pass "panel boot + home feed"

echo "==> Journey 1: foreground play from feed"
click_feed_row_play 1
wait_log "Open YouTube URL:" "foreground open"
wait_log "Opened:" "stream opened"
log_since | rg "Opened:" | tail -1
if log_since | rg -q "Foreground restore failed.*deminiaturize"; then
  fail "deminiaturize still called"
fi
if log_since | rg -q "on_load aborted"; then
  fail "foreground on_load aborted"
fi
pass "foreground play loads video"

echo "==> Journey 2: Now Playing metadata sync"
focus_youtube_panel
if log_since | rg -q "Chapters updated:|Listing qualities:"; then
  pass "Now Playing metadata synced"
else
  wait_log "Chapters updated:|Listing qualities:" "now playing metadata"
  pass "Now Playing metadata synced"
fi

echo "==> Journey 3: Listen from feed"
focus_youtube_panel
click_browse_tab || true
sleep 0.5
wait_feed_rows 2
click_feed_row_listen 2
wait_log "Background play: scheduling hide" "listen hide"
wait_log "Opened:" "listen stream opened"
pass "Listen starts background playback"

echo "==> Journey 4: foreground play another video (retire listener)"
focus_youtube_panel
agent-desktop press cmd+shift+y >/dev/null 2>&1 || true
sleep 1
click_browse_tab || true
sleep 0.8
wait_feed_rows 3
click_feed_row_play 3
wait_log "Open YouTube URL:" "second foreground open"
wait_log "Opened:|Replace YouTube in player:" "second foreground dispatch"
wait_log "Opened:" "second stream opened"
if log_since | rg -q "on_load aborted"; then
  fail "second foreground on_load aborted"
fi
if log_since | rg -q "closeManagedPlayer ignored \\(stale"; then
  pass "stale close correctly ignored"
fi
pass "foreground switch after Listen"

echo "==> Journey 5: tab navigation while playing"
click_now_playing_tab
sleep 1
click_browse_tab
sleep 1
click_now_playing_tab
sleep 1
pass "Browse / Now Playing tab switches"

echo "RESULT: PASS (all critical journeys)"
exit 0
