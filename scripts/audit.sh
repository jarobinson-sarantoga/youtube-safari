#!/usr/bin/env bash
# Automated audit for youtube-safari plugin. Exit 0 = all checks pass.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
FAIL=0
PASS=0

check() {
  local name="$1"
  shift
  if "$@" >/dev/null 2>&1; then
    echo "PASS: $name"
    PASS=$((PASS + 1))
  else
    echo "FAIL: $name" >&2
    FAIL=$((FAIL + 1))
  fi
}

echo "=== youtube-safari audit ==="

cd "$ROOT"
check "npm build" npm run build

check "resolve oxZeLM9rx7s (minimal env)" \
  env -i LC_ALL=en_US.UTF-8 /bin/bash "$ROOT/scripts/resolve.sh" "https://www.youtube.com/watch?v=oxZeLM9rx7s"

check "resolve qtkwn8fQMhg (minimal env)" \
  env -i LC_ALL=en_US.UTF-8 /bin/bash "$ROOT/scripts/resolve.sh" "https://www.youtube.com/watch?v=qtkwn8fQMhg"

check "resolve Ry840adL934 (minimal env)" \
  env -i LC_ALL=en_US.UTF-8 /bin/bash "$ROOT/scripts/resolve.sh" "https://www.youtube.com/watch?v=Ry840adL934"

check "resolve with pref args" \
  env -i LC_ALL=en_US.UTF-8 /bin/bash "$ROOT/scripts/resolve.sh" \
    "https://www.youtube.com/watch?v=oxZeLM9rx7s" \
    --cookies "$HOME/.config/yt-dlp/cookies.txt" \
    --ytdlp "$HOME/Library/Application Support/com.colliderli.iina/yt-dlp-iina" \
    --format "bestvideo[height<=2160][vcodec^=av01]+bestaudio[ext=m4a]/bestvideo[height<=2160][vcodec^=vp9]+bestaudio[acodec^=opus]/bestvideo[height<=2160][vcodec^=avc1]+bestaudio[ext=m4a]/bestvideo[height<=2160]+bestaudio/best[height<=2160]/best"

check "list-formats oxZeLM9rx7s (minimal env)" \
  env -i LC_ALL=en_US.UTF-8 /bin/bash "$ROOT/scripts/list-formats.sh" \
    "https://www.youtube.com/watch?v=oxZeLM9rx7s"

check "dist/index.js exists" test -f "$ROOT/dist/index.js"
check "plugin symlink" test -L "$HOME/Library/Application Support/com.colliderli.iina/plugins/youtube-safari.iinaplugin-dev"
check "official ytdl disabled" test "$(defaults read com.colliderli.iina PluginEnabled.io.iina.ytdl 2>/dev/null || echo 1)" = "0"
check "youtube-safari enabled" test "$(defaults read com.colliderli.iina PluginEnabled.com.jarobinson.youtube-safari 2>/dev/null || echo 0)" = "1"
check "cookies file readable" test -r "$HOME/.config/yt-dlp/cookies.txt"

echo "---"
echo "Passed: $PASS  Failed: $FAIL"
[ "$FAIL" -eq 0 ]