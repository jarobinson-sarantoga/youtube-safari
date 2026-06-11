#!/usr/bin/env bash
# open-url.sh — open a YouTube watch URL in IINA (native File → Open URL path).
# Usage: open-url.sh URL
set -euo pipefail

URL="${1:-}"
[ -n "$URL" ] || { echo "usage: open-url.sh YOUTUBE_WATCH_URL" >&2; exit 2; }

DATA_DIR="${HOME}/Library/Application Support/com.colliderli.iina/plugins/.data/com.jarobinson.youtube-safari"
mkdir -p "$DATA_DIR"
printf '%s' "$URL" > "$DATA_DIR/open-url.pending"

if ! pgrep -qx IINA; then
  open -a IINA "$URL"
  sleep 2
else
  open -a IINA "$URL" || true
fi

echo "Opened in IINA: $URL"