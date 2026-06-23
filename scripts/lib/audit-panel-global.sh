# Global entry bootstrap and shortcut wiring checks.

audit_panel_global() {
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
}
