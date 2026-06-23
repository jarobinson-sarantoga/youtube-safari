#!/usr/bin/env bash
# open-url-background.sh — queue a YouTube watch URL for background (Listen) playback.
# Usage: open-url-background.sh URL
set -euo pipefail

URL="${1:-}"
[ -n "$URL" ] || { echo "usage: open-url-background.sh YOUTUBE_WATCH_URL" >&2; exit 2; }

DATA_DIR="${HOME}/Library/Application Support/com.colliderli.iina/plugins/.data/com.jarobinson.youtube-safari"
mkdir -p "$DATA_DIR"
printf '{"url":"%s","background":true}' "$URL" > "$DATA_DIR/open-url.pending"
echo "Queued background play: $URL"

if ! pgrep -qx IINA; then
  open -a IINA
  echo "Started IINA (waiting for plugin global entry…)"
fi