#!/usr/bin/env bash
# test-journeys-desktop.sh — Critical YouTube plugin user journeys via agent-desktop.
# Usage: test-journeys-desktop.sh [--keep-iina]
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
LOG="${HOME}/Library/Application Support/com.colliderli.iina/plugins/.data/com.jarobinson.youtube-safari/youtube-safari.log"
TIMEOUT="${TIMEOUT:-120}"
CLOSE_ON_EXIT=1

while [[ $# -gt 0 ]]; do
  case "$1" in
    --keep-iina) CLOSE_ON_EXIT=0; shift ;;
    *) shift ;;
  esac
done

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

log_since() {
  tail -n +"$((LOG_OFFSET + 1))" "$LOG"
}

wait_log() {
  local pattern="$1"
  local label="$2"
  local deadline=$((SECONDS + TIMEOUT))
  while (( SECONDS < deadline )); do
    if log_since | rg -q "$pattern"; then
      return 0
    fi
    if log_since | rg -q "on_load aborted: player shutting down|Open URL ignored during shutdown"; then
      fail "playback aborted during $label"
    fi
    sleep 0.5
  done
  fail "timeout waiting for $label ($pattern)"
}

wait_feed_rows() {
  local min="${1:-1}"
  local deadline=$((SECONDS + TIMEOUT))
  while (( SECONDS < deadline )); do
    focus_youtube_panel
    local count
    count="$(agent-desktop snapshot --app IINA -i | python3 -c "
import json,sys
data=json.load(sys.stdin)
rows=0
def walk(n):
    global rows
    if not isinstance(n,dict): return
    if n.get('role')=='button':
        name=(n.get('name') or '').strip()
        desc=(n.get('description') or '').strip()
        if len(desc)>20 and name==desc:
            rows+=1
    for c in n.get('children') or []:
        walk(c)
walk(data.get('data',{}).get('tree',{}))
print(rows)
")"
    if [[ "$count" -ge "$min" ]]; then
      return 0
    fi
    sleep 0.5
  done
  fail "timeout waiting for feed rows in panel"
}

focus_youtube_panel() {
  osascript -e 'tell application "IINA" to activate
    tell application "System Events" to tell process "IINA"
      set frontmost to true
      repeat with w in windows
        if name of w contains "YouTube" then
          try
            perform action "AXRaise" of w
            set value of attribute "AXMinimized" of w to false
          end try
          exit repeat
        end if
      end repeat
    end tell' >/dev/null 2>&1 || true
  sleep 0.4
}

open_panel() {
  if ! pgrep -qx IINA; then
    echo "==> Launching IINA…"
    open -a IINA
    sleep 3
  fi
  focus_youtube_panel
  agent-desktop press cmd+shift+y >/dev/null
  agent-desktop wait --window "YouTube" --app IINA --timeout 15000 || fail "YouTube panel did not open"
  focus_youtube_panel
}

feed_row_ref() {
  local row="$1"
  local snap_json="$2"
  printf '%s' "$snap_json" | python3 -c "
import json,sys
data=json.load(sys.stdin)
rows=[]
def walk(n):
    if not isinstance(n,dict): return
    if n.get('role')=='button':
        name=(n.get('name') or '').strip()
        desc=(n.get('description') or '').strip()
        if len(desc)>20 and name==desc:
            rows.append(n.get('ref_id'))
    for c in n.get('children') or []:
        walk(c)
walk(data.get('data',{}).get('tree',{}))
idx=max(0,int('${row}')-1)
print(rows[idx] if idx < len(rows) else '')
"
}

panel_window_x() {
  osascript -e 'tell application "System Events" to tell process "IINA"
    set w to first window whose name contains "YouTube"
    set p to position of w
    return item 1 of p
  end tell' 2>/dev/null || echo "600"
}

click_xy() {
  local x="$1"
  local y="$2"
  agent-desktop mouse-move --xy "${x},${y}" >/dev/null
  sleep 0.2
  agent-desktop mouse-click --xy "${x},${y}" >/dev/null
}

click_feed_row_play() {
  local row="$1"
  local attempt ref snap_json
  for attempt in 1 2 3 4; do
    focus_youtube_panel
    snap_json="$(agent-desktop snapshot --app IINA -i)"
    ref="$(feed_row_ref "$row" "$snap_json")"
    if [[ -z "$ref" ]]; then
      agent-desktop press cmd+shift+y >/dev/null 2>&1 || true
      sleep 0.8
      continue
    fi
    echo "==> Foreground play row #$row ($ref)"
    LOG_OFFSET="$(wc -l < "$LOG" | tr -d ' ')"
    if agent-desktop click "$ref" >/dev/null 2>&1; then
      return 0
    fi
    sleep 0.6
  done
  fail "feed row #$row click failed"
}

click_feed_row_listen() {
  local row="$1"
  focus_youtube_panel
  local snap_json
  snap_json="$(agent-desktop snapshot --app IINA -i)"
  local snap_id
  snap_id="$(printf '%s' "$snap_json" | rg -o '"snapshot_id":"[^"]+"' | head -1 | cut -d'"' -f4)"
  local ref
  ref="$(feed_row_ref "$row" "$snap_json")"
  [[ -n "$ref" ]] || fail "feed row #$row not found"

  local win_x
  win_x="$(panel_window_x)"
  local hover_json
  hover_json="$(agent-desktop hover "$ref" --snapshot "$snap_id")"
  local y
  y="$(printf '%s' "$hover_json" | rg -o '"y":[0-9.]+' | head -1 | cut -d: -f2 | cut -d. -f1)"
  [[ -n "$y" ]] || fail "could not resolve Y for row #$row"

  local click_x=$((win_x + 8 + 56))
  echo "==> Listen row #$row at ${click_x},${y}"
  LOG_OFFSET="$(wc -l < "$LOG" | tr -d ' ')"
  click_xy "$click_x" "$y"
}

view_tab_ref() {
  local label="$1"
  local snap_json="$2"
  printf '%s' "$snap_json" | VIEW_TAB="$label" python3 -c "
import json,os,sys
label=os.environ['VIEW_TAB']
data=json.load(sys.stdin)
def walk(n):
    if not isinstance(n,dict): return None
    if n.get('role')=='button' and (n.get('name')==label or n.get('description')==label):
        return n.get('ref_id')
    for c in n.get('children') or []:
        r=walk(c)
        if r: return r
ref=walk(data.get('data',{}).get('tree',{}))
if ref:
    print(ref)
    raise SystemExit(0)
# Header tabs are the last two unnamed buttons in the tree.
unnamed=[]
def collect(n):
    if not isinstance(n,dict): return
    if n.get('role')=='button' and not n.get('name') and n.get('ref_id'):
        unnamed.append(n.get('ref_id'))
    for c in n.get('children') or []:
        collect(c)
collect(data.get('data',{}).get('tree',{}))
tabs=unnamed[-2:] if len(unnamed) >= 2 else unnamed
idx=0 if label=='Browse' else 1
print(tabs[idx] if idx < len(tabs) else '')
"
}

click_now_playing_tab() {
  local attempt ref snap_json
  for attempt in 1 2 3 4; do
    focus_youtube_panel
    snap_json="$(agent-desktop snapshot --app IINA -i)"
    ref="$(view_tab_ref "Now Playing" "$snap_json")"
    if [[ -n "$ref" ]]; then
      agent-desktop click "$ref" >/dev/null || fail "click failed for $ref"
      return 0
    fi
    sleep 0.6
  done
  fail "Now Playing tab not found"
}

click_browse_tab() {
  local attempt ref snap_json
  for attempt in 1 2 3 4; do
    focus_youtube_panel
    snap_json="$(agent-desktop snapshot --app IINA -i)"
    ref="$(view_tab_ref "Browse" "$snap_json")"
    if [[ -n "$ref" ]]; then
      agent-desktop click "$ref" >/dev/null 2>&1 && return 0
    fi
    agent-desktop press cmd+shift+y >/dev/null 2>&1 || true
    sleep 0.5
  done
  fail "Browse tab not found"
}

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