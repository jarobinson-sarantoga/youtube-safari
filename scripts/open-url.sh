#!/usr/bin/env bash
# open-url.sh — open a YouTube watch URL in IINA (native File → Open URL path).
# Usage: open-url.sh URL
set -euo pipefail

URL="${1:-}"
[ -n "$URL" ] || { echo "usage: open-url.sh YOUTUBE_WATCH_URL" >&2; exit 2; }

if ! pgrep -qx IINA; then
  open -a IINA
  sleep 3
fi

# Native handoff: same code path as File → Open URL and OpenInIINA (iina://weblink).
open -a IINA "$URL"
echo "Opened in IINA: $URL"