# Feed controller and cookie health wiring checks.

audit_panel_feed() {
  if grep -q "notifyCookieHealthIfNeeded" "$ROOT/src/cookie-health.ts" \
    && grep -q "notifyCookieHealthIfNeeded" "$ROOT/src/global.ts" \
    && grep -q 'notifyCookieHealthIfNeeded({ osd: true })' "$ROOT/src/browse/init/install.ts"; then
    pass "cookie health notify on global + player startup"
  else
    fail "cookie health startup wiring incomplete"
  fi

  if grep -q "registerBrowseHandlers" "$ROOT/src/sidebar-host.ts"; then
    pass "sidebar-host re-registers browse handlers on sidebarReady"
  else
    fail "sidebar-host missing registerBrowseHandlers on sidebarReady"
  fi

  local FEED_CTRL="$ROOT/src/sidebar/feed-controller.ts"
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
}
