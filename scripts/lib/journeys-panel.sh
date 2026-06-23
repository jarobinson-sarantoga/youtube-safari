# Panel focus and tab navigation for journey tests.

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

view_tab_ref() {
  local label="$1"
  local snap_json="$2"
  printf '%s' "$snap_json" | VIEW_TAB="$label" python3 "$ROOT/scripts/lib/view-tab-ref.py"
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
