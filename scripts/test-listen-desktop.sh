#!/usr/bin/env bash
# test-listen-desktop.sh — UI test Listen via agent-desktop + log verification.
# Usage: test-listen-desktop.sh [--row N]
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
LOG="${HOME}/Library/Application Support/com.colliderli.iina/plugins/.data/com.jarobinson.youtube-safari/youtube-safari.log"
TIMEOUT="${TIMEOUT:-90}"
ROW=1
CLOSE_ON_EXIT=1
while [[ $# -gt 0 ]]; do
  case "$1" in
    --row) ROW="${2:-1}"; shift 2 ;;
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

command -v agent-desktop >/dev/null || {
  echo "FAIL: agent-desktop not installed (npm i -g agent-desktop)" >&2
  exit 1
}

perm_state() {
  agent-desktop permissions 2>/dev/null | rg -o '"accessibility":\{"state":"[^"]+"' | rg -o 'granted|denied|unknown' | head -1
}

if [[ "$(perm_state)" != "granted" ]]; then
  echo "FAIL: agent-desktop accessibility permission not granted" >&2
  agent-desktop permissions 2>&1
  exit 1
fi

if ! pgrep -qx IINA; then
  echo "==> Launching IINA…"
  open -a IINA
  sleep 3
fi
agent-desktop wait --window "YouTube" --app IINA --timeout 20000 >/dev/null 2>&1 || \
  agent-desktop wait --window "IINA" --timeout 20000 >/dev/null 2>&1 || true

agent-desktop focus-window --app IINA >/dev/null 2>&1 || true
agent-desktop press cmd+shift+y >/dev/null
if ! agent-desktop wait --window "YouTube" --app IINA --timeout 10000; then
  echo "FAIL: YouTube panel did not open" >&2
  exit 1
fi

SNAP_JSON="$(agent-desktop snapshot --app IINA -i)"
SNAP_ID="$(printf '%s' "$SNAP_JSON" | rg -o '"snapshot_id":"[^"]+"' | head -1 | cut -d'"' -f4)"
# Feed video rows are buttons with a description (title) inside the webarea group.
REF="$(
  printf '%s' "$SNAP_JSON" | python3 -c "
import json,sys
data=json.load(sys.stdin)
rows=[]
def walk(n):
    if not isinstance(n,dict): return
    if n.get('role')=='button' and n.get('description') and n.get('name')==n.get('description'):
        if len(n.get('description',''))>20:
            rows.append(n.get('ref_id'))
    for c in n.get('children') or []:
        walk(c)
walk(data.get('data',{}).get('tree',{}))
idx=max(0,int('${ROW}')-1)
print(rows[idx] if idx < len(rows) else '')
"
)"

if [[ -z "$REF" ]]; then
  echo "FAIL: could not find feed row ref #$ROW in snapshot" >&2
  exit 1
fi

WIN_POS="$(osascript -e 'tell application "System Events" to tell process "IINA"
  set w to first window whose name contains "YouTube"
  set p to position of w
  return (item 1 of p as text) & "," & (item 2 of p as text)
end tell' 2>/dev/null || echo "600,39")"
WIN_X="${WIN_POS%%,*}"
CLICK_X=$((WIN_X + 8 + 56))

HOVER_JSON="$(agent-desktop hover "$REF" --snapshot "$SNAP_ID")"
CLICK_Y="$(printf '%s' "$HOVER_JSON" | rg -o '"y":[0-9.]+' | head -1 | cut -d: -f2 | cut -d. -f1)"
if [[ -z "$CLICK_Y" ]]; then
  echo "FAIL: could not resolve hover Y for $REF" >&2
  exit 1
fi

LOG_OFFSET="$(wc -l < "$LOG" | tr -d ' ')"
echo "==> Click Listen on $REF at ${CLICK_X},${CLICK_Y} (snapshot $SNAP_ID)"
agent-desktop mouse-move --xy "${CLICK_X},${CLICK_Y}" >/dev/null
sleep 0.25
agent-desktop mouse-click --xy "${CLICK_X},${CLICK_Y}" >/dev/null

deadline=$((SECONDS + TIMEOUT))
pass=0
while (( SECONDS < deadline )); do
  if tail -n +"$((LOG_OFFSET + 1))" "$LOG" | rg -q "Background play: scheduling hide"; then
    pass=1
    break
  fi
  sleep 0.5
done

echo "=== log since test ==="
tail -n +"$((LOG_OFFSET + 1))" "$LOG" | rg -i "Open YouTube URL|openYouTubeWatch|Drained|Background play|Open YouTube in player|player window hidden" || true

if [[ "$pass" -ne 1 ]]; then
  echo "RESULT: FAIL (no Background play: scheduling hide)" >&2
  exit 1
fi

if tail -n +"$((LOG_OFFSET + 1))" "$LOG" | rg -q "Open YouTube URL:.*background"; then
  echo "PASS: background URL opened"
else
  echo "FAIL: missing background URL log" >&2
  exit 1
fi

if tail -n +"$((LOG_OFFSET + 1))" "$LOG" | rg -q "minimized|off-screen|Open YouTube in player"; then
  echo "PASS: playback started / hide attempted"
else
  echo "FAIL: hide/playback log incomplete" >&2
  exit 1
fi

echo "==> Waiting for resolve/open…"
deadline=$((SECONDS + TIMEOUT))
resolved=0
while (( SECONDS < deadline )); do
  if tail -n +"$((LOG_OFFSET + 1))" "$LOG" | rg -q "Resolved:|Opened:"; then
    resolved=1
    break
  fi
  if tail -n +"$((LOG_OFFSET + 1))" "$LOG" | rg -q "ignored during shutdown|on_load aborted"; then
    echo "FAIL: playback aborted during load" >&2
    tail -n +"$((LOG_OFFSET + 1))" "$LOG" | rg -i "shutdown|aborted|ignored" || true
    exit 1
  fi
  sleep 0.5
done

if [[ "$resolved" -ne 1 ]]; then
  echo "FAIL: no Resolved/Opened in log (audio likely not playing)" >&2
  exit 1
fi
tail -n +"$((LOG_OFFSET + 1))" "$LOG" | rg "Resolved:|Opened:" | tail -2
echo "PASS: stream resolved and opened"

echo "==> Verifying player window minimized…"
sleep 1
MINI_OK="$(osascript -e 'tell application "System Events" to tell process "IINA"
  set found to false
  repeat with w in windows
    if name of w does not contain "YouTube" then
      if value of attribute "AXMinimized" of w then
        set found to true
        exit repeat
      end if
    end if
  end repeat
  return found
end tell' 2>/dev/null || echo "false")"
if [[ "$MINI_OK" != "true" ]]; then
  echo "FAIL: background player window not minimized" >&2
  osascript -e 'tell application "System Events" to tell process "IINA"
    repeat with w in windows
      log ((name of w) & " mini=" & (value of attribute "AXMinimized" of w))
    end repeat
  end tell' 2>&1 || true
  exit 1
fi
echo "PASS: background player window minimized (Dock only)"
if tail -n +"$((LOG_OFFSET + 1))" "$LOG" | rg -q "minimized|off-screen|hide complete"; then
  echo "PASS: hide strategy applied in log"
else
  echo "FAIL: no successful hide strategy in log" >&2
  exit 1
fi

echo "RESULT: PASS (agent-desktop Listen)"
exit 0