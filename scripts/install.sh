#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

echo "==> Building youtube-safari plugin"
npm install
npm run build

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

echo "==> Disabling official Online Media plugin (prevents race on YouTube URLs)"
defaults write com.colliderli.iina "PluginEnabled.io.iina.ytdl" -bool false
defaults write com.colliderli.iina "PluginEnabled.com.jarobinson.youtube-safari" -bool true
echo "    io.iina.ytdl disabled; com.jarobinson.youtube-safari enabled"

echo ""
echo "Restart IINA, then try File → Open URL with a YouTube watch link."
echo "If playback fails, run: bash $ROOT/scripts/refresh-cookies.sh (in Terminal)"
echo "Done."