# agent-desktop helpers for Listen UI tests.

require_agent_desktop() {
  command -v agent-desktop >/dev/null || {
    echo "FAIL: agent-desktop not installed (npm i -g agent-desktop)" >&2
    exit 1
  }
  local state
  state="$(agent-desktop permissions 2>/dev/null | rg -o '"accessibility":\{"state":"[^"]+"' | rg -o 'granted|denied|unknown' | head -1)"
  if [[ "$state" != "granted" ]]; then
    echo "FAIL: agent-desktop accessibility permission not granted" >&2
    agent-desktop permissions 2>&1
    exit 1
  fi
}

open_iina_youtube_panel() {
  if ! pgrep -qx IINA; then
    echo "==> Launching IINA…"
    open -a IINA
    sleep 3
  fi
  agent-desktop wait --window "YouTube" --app IINA --timeout 20000 >/dev/null 2>&1 || \
    agent-desktop wait --window "IINA" --timeout 20000 >/dev/null 2>&1 || true
  agent-desktop focus-window --app IINA >/dev/null 2>&1 || true
  agent-desktop press cmd+shift+y >/dev/null
  agent-desktop wait --window "YouTube" --app IINA --timeout 10000 >/dev/null 2>&1
}

feed_row_ref_from_snapshot() {
  local snap_json="$1"
  local row="$2"
  local script_dir="$3"
  printf '%s' "$snap_json" | python3 "$script_dir/lib/feed-row-ref.py" "$row"
}

listen_click_xy() {
  local ref="$1"
  local snap_id="$2"
  local win_pos
  win_pos="$(osascript -e 'tell application "System Events" to tell process "IINA"
    set w to first window whose name contains "YouTube"
    set p to position of w
    return (item 1 of p as text) & "," & (item 2 of p as text)
  end tell' 2>/dev/null || echo "600,39")"
  local win_x="${win_pos%%,*}"
  local click_x=$((win_x + 8 + 56))
  local hover_json click_y
  hover_json="$(agent-desktop hover "$ref" --snapshot "$snap_id")"
  click_y="$(printf '%s' "$hover_json" | rg -o '"y":[0-9.]+' | head -1 | cut -d: -f2 | cut -d. -f1)"
  [ -n "$click_y" ] || return 1
  echo "$click_x $click_y"
}

iina_background_player_minimized() {
  osascript -e 'tell application "System Events" to tell process "IINA"
    repeat with w in windows
      if name of w does not contain "YouTube" then
        if value of attribute "AXMinimized" of w then return true
      end if
    end repeat
    return false
  end tell' 2>/dev/null || echo "false"
}
