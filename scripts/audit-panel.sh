#!/usr/bin/env bash
# Semantic audit for the YouTube sidebar panel (HTML/CSS/JS wiring).
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

PASS=0
FAIL=0

pass() { echo "PASS: $1"; PASS=$((PASS + 1)); }
fail() { echo "FAIL: $1"; FAIL=$((FAIL + 1)); }

echo "=== youtube-safari panel audit ==="

# 1. Asset paths must be relative to sidebar/shell.html (IINA webview rule)
HTML="$ROOT/sidebar/shell.html"
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

# 2. Required DOM ids referenced by sidebar TS
REQUIRED_IDS=(
  browse-view player-view search-input search-btn feed-refresh
  feed-status feed-list video-title player-thumb player-hero-sub
  progress-fill player-time-pos player-time-dur player-progress-block
  quality-status quality-list chapter-list description related-preview
)

for id in "${REQUIRED_IDS[@]}"; do
  if grep -q "id=\"$id\"" "$HTML"; then
    pass "DOM #$id"
  else
    fail "missing DOM id #$id in shell.html"
  fi
done

# 3. Sidebar TS must reference same ids (basic grep)
BROWSE_TS="$ROOT/src/sidebar/browse.ts"
PLAYER_TS="$ROOT/src/sidebar/player.ts"
for id in feed-list feed-status search-input video-title quality-list; do
  if grep -q "\"$id\"" "$BROWSE_TS" || grep -q "\"$id\"" "$PLAYER_TS" || grep -q "\"$id\"" "$ROOT/src/sidebar/views.ts"; then
    pass "TS references #$id"
  else
    fail "sidebar TS missing reference to #$id"
  fi
done

# 4. Message wiring — sidebar posts, plugin handles
SIDEBAR_POSTS=(browseRefresh playVideo sidebarReady selectQuality descriptionSeek openUrl requestRelatedPreview refreshPanel)
for msg in "${SIDEBAR_POSTS[@]}"; do
  PLUGIN_MSG_SRC=(
    "$ROOT/src/quality-ui.ts"
    "$ROOT/src/sidebar-host.ts"
    "$ROOT/src/native-menus.ts"
    "$ROOT/src/related-preview-bridge.ts"
    "$ROOT/src/browse/bridge.ts"
  )
  if grep -rq "\"$msg\"" "$ROOT/src/sidebar/" && grep -rq "\"$msg\"" "${PLUGIN_MSG_SRC[@]}" 2>/dev/null; then
    pass "message wire: $msg"
  elif [[ "$msg" == "sidebarReady" || "$msg" == "selectQuality" || "$msg" == "descriptionSeek" || "$msg" == "openUrl" ]]; then
    if grep -rq "$msg" "$ROOT/src/quality-ui.ts" "$ROOT/src/sidebar-host.ts" 2>/dev/null; then
      pass "message wire: $msg"
    else
      fail "plugin missing handler for $msg"
    fi
  elif grep -rq "$msg" "$ROOT/src/browse/bridge.ts"; then
    pass "message wire: $msg"
  else
    fail "broken message wire: $msg"
  fi
done

PLUGIN_POSTS=(feedResult panel playerState focusBrowse focusPlayer watchUrlChanged feedsStale historyStale browseReady relatedPreview)
for msg in "${PLUGIN_POSTS[@]}"; do
  if grep -rq "\"$msg\"" "$ROOT/src/sidebar/" && grep -rq "$msg" \
    "$ROOT/src/quality-ui.ts" \
    "$ROOT/src/sidebar-host.ts" \
    "$ROOT/src/related-preview-bridge.ts" \
    "$ROOT/src/browse/" 2>/dev/null; then
    pass "message wire: $msg"
  else
    fail "broken message wire: $msg"
  fi
done

# 5. Build artifacts (skip if parent audit already built)
if [[ "${PANEL_SKIP_BUILD:-}" == "1" ]]; then
  pass "npm build (skipped — already ran)"
elif npm run build >/dev/null 2>&1; then
  pass "npm build"
else
  fail "npm build"
fi

if [[ -f "$ROOT/dist/sidebar/shell.js" ]]; then
  pass "dist/sidebar/shell.js exists"
else
  fail "missing dist/sidebar/shell.js"
fi

# 6. Built JS contains init paths (sanity)
if grep -q "browseRefresh" "$ROOT/dist/sidebar/shell.js"; then
  pass "built shell.js contains browseRefresh"
else
  fail "built shell.js missing browseRefresh"
fi

if grep -q "playerState" "$ROOT/dist/sidebar/shell.js"; then
  pass "built shell.js contains playerState"
else
  fail "built shell.js missing playerState"
fi

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

if grep -q 'Shift+y' "$ROOT/src/shortcuts.ts" && grep -q 'input.onKeyDown' "$ROOT/src/shortcuts.ts"; then
  pass "Shift+y key binding registered on player entry"
else
  fail "Shift+y key binding missing from player shortcuts"
fi

if grep -q 'keyBinding.*Shift+y' "$ROOT/src/global.ts"; then
  fail "global entry must not register Shift+y (conflicts with player handler)"
else
  pass "global entry leaves Shift+y to focused player"
fi

if grep -q "registerBrowseShortcut" "$ROOT/src/quality-ui.ts"; then
  pass "player entry registers browse shortcut"
else
  fail "quality-ui missing registerBrowseShortcut"
fi

if grep -q "input.onKeyDown" "$ROOT/src/shortcuts.ts"; then
  pass "input.onKeyDown fallback registered"
else
  fail "missing input.onKeyDown fallback"
fi

if grep -q 'Shift+y ignore' "$ROOT/scripts/install.sh"; then
  pass "install.sh writes Shift+y input binding"
else
  fail "install.sh missing Shift+y input binding line"
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

if grep -q "notifyCookieHealthIfNeeded" "$ROOT/src/cookie-health.ts" \
  && grep -q "notifyCookieHealthIfNeeded" "$ROOT/src/global.ts" \
  && grep -q 'notifyCookieHealthIfNeeded({ osd: true })' "$ROOT/src/browse/init.ts"; then
  pass "cookie health notify on global + player startup"
else
  fail "cookie health startup wiring incomplete"
fi

if grep -q "registerBrowseHandlers" "$ROOT/src/sidebar-host.ts"; then
  pass "sidebar-host re-registers browse handlers on sidebarReady"
else
  fail "sidebar-host missing registerBrowseHandlers on sidebarReady"
fi

if grep -q "getListedTitle" "$ROOT/src/sidebar-host.ts" \
  && grep -q "buildPanelPayload" "$ROOT/src/sidebar-host.ts"; then
  pass "buildPanelPayload uses getListedTitle from native-menus"
else
  fail "buildPanelPayload missing getListedTitle wiring"
fi

echo "---"
echo "Passed: $PASS  Failed: $FAIL"
[[ "$FAIL" -eq 0 ]]