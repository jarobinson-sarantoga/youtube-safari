# Sidebar ↔ plugin message wiring checks.

audit_panel_messages() {
  local SIDEBAR_POSTS=(browseRefresh playVideo sidebarReady selectQuality descriptionSeek openUrl requestRelatedPreview refreshPanel)
  local msg
  for msg in "${SIDEBAR_POSTS[@]}"; do
    local PLUGIN_MSG_SRC=(
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

  local PLUGIN_POSTS=(feedResult panel playerState focusBrowse focusPlayer watchUrlChanged feedsStale historyStale browseReady relatedPreview)
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
}

audit_panel_build() {
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
}
