# Panel asset paths and required DOM ids.

audit_panel_assets() {
  local HTML="$ROOT/sidebar/shell.html"

  if grep -q 'href="shell.css"' "$HTML"; then
    pass "shell.css path relative to HTML"
  else
    fail "shell.css must be href=\"shell.css\" (relative to HTML file)"
  fi

  if grep -q 'src="../dist/sidebar/shell.js"' "$HTML"; then
    pass "shell.js path relative to HTML"
  else
    fail "shell.js must be src=\"../dist/sidebar/shell.js\""
  fi

  if [[ -f "$ROOT/sidebar/shell.css" ]]; then
    pass "shell.css exists"
  else
    fail "missing sidebar/shell.css"
  fi

  local REQUIRED_IDS=(
    browse-view player-view search-input feed-refresh
    feed-status feed-list video-title player-thumb player-hero-sub
    progress-fill player-time-pos player-time-dur player-progress-block
    quality-status quality-list chapter-list description related-preview
  )

  local id
  for id in "${REQUIRED_IDS[@]}"; do
    if grep -q "id=\"$id\"" "$HTML"; then
      pass "DOM #$id"
    else
      fail "missing DOM id #$id in shell.html"
    fi
  done

  local BROWSE_TS="$ROOT/src/sidebar/browse.ts"
  local PLAYER_TS="$ROOT/src/sidebar/player.ts"
  for id in feed-list feed-status search-input video-title quality-list; do
    if grep -q "\"$id\"" "$BROWSE_TS" || grep -q "\"$id\"" "$PLAYER_TS" || grep -q "\"$id\"" "$ROOT/src/sidebar/views.ts"; then
      pass "TS references #$id"
    else
      fail "sidebar TS missing reference to #$id"
    fi
  done
}

audit_panel_browse_ui() {
  local HTML="$ROOT/sidebar/shell.html"

  for tab in home subscriptions related history; do
    if grep -q "data-tab=\"$tab\"" "$HTML"; then
      pass "browse segment tab: $tab"
    else
      fail "missing browse segment data-tab=\"$tab\""
    fi
  done

  if grep -q 'id="subs-filter"' "$HTML" && grep -q 'data-subs-filter="all"' "$HTML" && grep -q 'data-subs-filter="shorts"' "$HTML"; then
    pass "subs filter row (all + shorts)"
  else
    fail "missing subs filter row in shell.html"
  fi

  if grep -q 'data-view="player".*active' "$HTML" || grep -q 'class="view-btn active" data-view="player"' "$HTML"; then
    pass "Now Playing is default panel tab"
  else
    fail "shell.html does not default to Now Playing tab"
  fi

  if grep -q 'id="chapter-list".*panel-select' "$HTML"; then
    pass "chapters use dropdown select"
  else
    fail "shell.html missing chapter panel-select dropdown"
  fi
}
