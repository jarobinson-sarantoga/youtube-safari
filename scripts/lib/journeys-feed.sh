# Feed row interactions for journey tests.

feed_row_ref() {
  local row="$1"
  local snap_json="$2"
  printf '%s' "$snap_json" | python3 "$ROOT/scripts/lib/feed-row-ref.py" "$row"
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
