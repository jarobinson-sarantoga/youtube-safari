#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

echo "==> Building youtube-safari plugin"
npm install
npm run build
echo "    (optional: npm test — run scripts/audit.sh for full checks)"

IINA_PLUGIN="/Applications/IINA.app/Contents/MacOS/iina-plugin"
if [ ! -x "$IINA_PLUGIN" ]; then
  echo "ERROR: IINA not found at $IINA_PLUGIN" >&2
  exit 1
fi

if command -v iina-plugin >/dev/null 2>&1; then
  IINA_PLUGIN_CMD=iina-plugin
elif [ -x "$IINA_PLUGIN" ]; then
  IINA_PLUGIN_CMD="$IINA_PLUGIN"
else
  echo "ERROR: iina-plugin command not found" >&2
  exit 1
fi

if [ ! -e /usr/local/bin/iina-plugin ]; then
  echo "==> Linking iina-plugin into /usr/local/bin (optional)"
  if mkdir -p /usr/local/bin 2>/dev/null && ln -sf "$IINA_PLUGIN" /usr/local/bin/iina-plugin 2>/dev/null; then
    IINA_PLUGIN_CMD=iina-plugin
  else
    echo "    skipped (no permission for /usr/local/bin); using $IINA_PLUGIN"
  fi
fi

echo "==> Linking plugin into IINA"
DEV_LINK="$HOME/Library/Application Support/com.colliderli.iina/plugins/youtube-safari.iinaplugin-dev"
if [ -L "$DEV_LINK" ] && [ "$(readlink "$DEV_LINK")" = "$ROOT" ]; then
  echo "    dev symlink already points to $ROOT"
else
  [ -L "$DEV_LINK" ] && rm -f "$DEV_LINK"
  "$IINA_PLUGIN_CMD" link "$ROOT"
fi

PLIST="$HOME/Library/Application Support/com.colliderli.iina/plugins/.preferences/io.iina.ytdl.plist"
PATTERN='googlevideo\.com'

echo "==> Updating official Online Media plugin excluded_urls"
if [ -f "$PLIST" ]; then
  if /usr/libexec/PlistBuddy -c "Print :excluded_urls" "$PLIST" >/dev/null 2>&1; then
    CURRENT="$(/usr/libexec/PlistBuddy -c "Print :excluded_urls" "$PLIST")"
    if echo "$CURRENT" | grep -q 'googlevideo'; then
      echo "    excluded_urls already contains googlevideo"
    else
      NEW="${CURRENT}|${PATTERN}"
      /usr/libexec/PlistBuddy -c "Set :excluded_urls '${NEW}'" "$PLIST"
      echo "    merged excluded_urls: ${NEW}"
    fi
  else
    /usr/libexec/PlistBuddy -c "Add :excluded_urls string '${PATTERN}'" "$PLIST"
    echo "    added excluded_urls: ${PATTERN}"
  fi
else
  echo "    WARNING: official ytdl prefs not found at $PLIST (skipped)"
fi

PLUGIN_DIR="$HOME/Library/Application Support/com.colliderli.iina/plugins"

echo ""
echo "Build output:"
ls -la "$ROOT/dist/"

echo ""
echo "Install result:"
ls -la "$PLUGIN_DIR" | grep -i youtube-safari || echo "  Plugin symlink not found (check iina-plugin link output)"

INPUT_CONF_DIR="$HOME/Library/Application Support/com.colliderli.iina/input_conf"
PROFILE="$(defaults read com.colliderli.iina currentInputConfigName 2>/dev/null || echo "input")"
PROFILE_FILE="$INPUT_CONF_DIR/${PROFILE}.conf"
if [ ! -f "$PROFILE_FILE" ]; then
  PROFILE_FILE="$INPUT_CONF_DIR/input"
fi
PANEL_MARKER="# youtube-safari: Open YouTube Panel (Cmd+Shift+Y)"
PANEL_BINDING="Meta+Shift+Y ignore"
echo "==> Adding Cmd+Shift+Y to IINA input profile (${PROFILE})"
if [ -f "$PROFILE_FILE" ]; then
  perl -0pi -e 's/\n# youtube-safari:.*?\n(?:#.*?\n)*(?:Meta\+Shift\+Y|Shift\+y) ignore\n?//g' "$PROFILE_FILE" 2>/dev/null || true
  if ! grep -qF "$PANEL_BINDING" "$PROFILE_FILE"; then
    printf '\n%s\n# mpv ignores this key so Plugin menu / player shortcut can handle it.\n# Also works via scripts/open-panel.sh (global queue poller).\n%s\n' \
      "$PANEL_MARKER" "$PANEL_BINDING" >> "$PROFILE_FILE"
    echo "    added ${PANEL_BINDING} to ${PROFILE}"
  else
    echo "    ${PANEL_BINDING} already in ${PROFILE}"
  fi
else
  echo "    WARNING: profile not found at $PROFILE_FILE (skipped)"
fi

echo "==> Disabling official Online Media plugin (prevents race on YouTube URLs)"
defaults write com.colliderli.iina "PluginEnabled.io.iina.ytdl" -bool false
defaults write com.colliderli.iina "PluginEnabled.com.jarobinson.youtube-safari" -bool false
defaults write com.colliderli.iina "PluginEnabled.com.jarobinson-sarantoga.youtube-safari" -bool true
echo "    io.iina.ytdl and legacy identifier disabled; com.jarobinson-sarantoga.youtube-safari enabled"

# IINA issue #4688: this workaround blocks startup for minutes when recents point at slow volumes.
if [ "$(defaults read com.colliderli.iina enableRecentDocumentsWorkaround 2>/dev/null || echo 0)" = "1" ]; then
  defaults write com.colliderli.iina enableRecentDocumentsWorkaround -bool false
  echo "    disabled enableRecentDocumentsWorkaround (prevents IINA startup hangs)"
fi

echo ""
chmod +x "$ROOT/scripts/open-panel.sh" 2>/dev/null || true
echo ""
echo "Restart IINA, then press Cmd+Shift+Y or use Plugin → Open YouTube Panel."
echo "Shortcut paths: Plugin menu (no player), player input.onKeyDown, input_conf ignore."
echo "CLI fallback: $ROOT/scripts/open-panel.sh"
echo "If the shortcut fails but the menu item works, open Plugin menu and confirm"
echo "  Open YouTube Panel shows ⌘⇧Y. If missing, check for Conflicting key shortcuts…"
echo "  at the top of the Plugin menu, or IINA Settings → Key Bindings → Plugin."
echo "If playback fails, use Plugin → Refresh YouTube (IINA needs Full Disk Access)"
echo "Done."