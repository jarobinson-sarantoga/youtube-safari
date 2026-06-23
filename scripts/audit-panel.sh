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
  browse-view player-view search-input feed-refresh
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
    "$ROOT/src/standalone-bridge.ts"
    "$ROOT/src/panel-handlers.ts"
  )
  if grep -rq "\"$msg\"" "$ROOT/src/sidebar/" && grep -rq "\"$msg\"" "${PLUGIN_MSG_SRC[@]}" 2>/dev/null; then
    pass "message wire: $msg"
  elif [[ "$msg" == "sidebarReady" || "$msg" == "selectQuality" || "$msg" == "descriptionSeek" || "$msg" == "openUrl" ]]; then
    if grep -rq "$msg" "$ROOT/src/quality-ui.ts" "$ROOT/src/sidebar-host.ts" "$ROOT/src/standalone-bridge.ts" 2>/dev/null; then
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
    "$ROOT/src/panel-relay.ts" \
    "$ROOT/src/standalone-host.ts" \
    "$ROOT/src/standalone-bridge.ts" \
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

if grep -q 'Meta+Shift+Y' "$ROOT/src/keybindings.ts" && grep -q 'keyBinding' "$ROOT/src/global.ts"; then
  pass "Cmd+Shift+Y key binding on global Plugin menu"
else
  fail "global menu missing Cmd+Shift+Y (Meta+Shift+Y) binding"
fi

if grep -q 'setTimeout(installGlobalMenuItems' "$ROOT/src/global.ts"; then
  fail "global menu must register synchronously (like User Scripts Meta+Shift+U)"
else
  pass "global menu registers synchronously at global entry load"
fi

if grep -q 'bootstrapGlobalEntry' "$ROOT/src/global.ts" \
  && grep -q 'function installGlobalMenuItems' "$ROOT/src/global.ts"; then
  pass "global bootstrap uses hoisted function declarations"
else
  fail "global.ts must use bootstrapGlobalEntry + function installGlobalMenuItems"
fi

if [ -f "$ROOT/dist/global.js" ] && node -e "
const fs=require('fs');
const s=fs.readFileSync('$ROOT/dist/global.js','utf8');
const entry=s.indexOf('Global entry loaded');
const shell=s.indexOf('Standalone shell preloaded');
const menu=s.indexOf('Global plugin menu installed');
if (entry < 0 || shell < 0 || menu < 0) process.exit(1);
if (!(shell < menu && menu < entry)) process.exit(2);
" 2>/dev/null; then
  pass "built global.js init order: shell → menu → global entry"
else
  fail "built global.js init order broken — rebuild global.ts bootstrap"
fi

if awk '/initStandaloneShell\(\)/{s=1} /installGlobalMenuItems\(\)/{if(s){found=1; exit}} END{exit !found}' "$ROOT/src/global.ts"; then
  pass "standalone shell preloaded before global menu (User Scripts order)"
else
  fail "call initStandaloneShell() before installGlobalMenuItems() in global.ts"
fi

if grep -q 'menu.forceUpdate' "$ROOT/src/global.ts" && grep -q 'setTimeout' "$ROOT/src/global.ts"; then
  pass "plugin menu forceUpdate deferred after IINA keybinding load"
else
  fail "defer menu.forceUpdate() so Plugin menu keyEquivalent attaches"
fi

if grep -q 'initStandaloneShell' "$ROOT/src/global.ts" && grep -q 'loadFile' "$ROOT/src/standalone-host.ts"; then
  pass "standalone shell preloaded at global startup"
else
  fail "standalone shell must preload at global startup (no player windows)"
fi

if grep -q 'registerPlayerPanelShortcut' "$ROOT/src/index.ts" \
  && grep -q 'input.onKeyDown' "$ROOT/src/player-shortcut.ts" \
  && grep -q 'BROWSE_KEY_BINDING' "$ROOT/src/player-shortcut.ts"; then
  pass "player Cmd+Shift+Y shortcut (pairs with input_conf ignore)"
else
  fail "player panel shortcut missing (registerPlayerPanelShortcut + input.onKeyDown)"
fi

if grep -q 'Meta+Shift+Y ignore' "$ROOT/scripts/install.sh" \
  && grep -q 'startOpenPanelQueuePoller' "$ROOT/src/global.ts"; then
  pass "install.sh writes Meta+Shift+Y input_conf + open-panel queue poller"
else
  fail "install.sh must add Meta+Shift+Y ignore to input_conf"
fi

if ! test -f "$ROOT/scripts/install-global-hotkey.sh"; then
  pass "no skhd installer"
else
  fail "remove scripts/install-global-hotkey.sh"
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

FEED_CTRL="$ROOT/src/sidebar/feed-controller.ts"
if grep -q "initFeedController" "$FEED_CTRL" && grep -q "initFeedController" "$ROOT/src/sidebar/browse.ts"; then
  pass "feed-controller initFeedController wired from browse.ts"
else
  fail "feed-controller initFeedController not wired"
fi

if grep -q "onFeedsStale" "$FEED_CTRL" && grep -q "feedSnapshots" "$FEED_CTRL" \
  && grep -q "onFeedsStale" "$ROOT/src/sidebar/browse.ts"; then
  pass "feed-controller onFeedsStale clears feedSnapshots"
else
  fail "feed-controller onFeedsStale / feedSnapshots wiring incomplete"
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