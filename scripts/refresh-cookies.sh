#!/usr/bin/env bash
# Export YouTube cookies from Safari for yt-dlp.
set -eo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
# shellcheck source=env.sh
source "$SCRIPT_DIR/env.sh"

YTDLP="${YTDLP:-/opt/homebrew/bin/yt-dlp}"
[ -x "$YTDLP" ] || YTDLP="/usr/local/bin/yt-dlp"

COOKIES="${COOKIES:-$HOME/.config/yt-dlp/cookies.txt}"
URL="${1:-https://www.youtube.com/watch?v=jNQXAC9IVRw}"

mkdir -p "$(dirname "$COOKIES")"
BEFORE_MTIME=""
if [ -f "$COOKIES" ]; then
  BEFORE_MTIME="$(/usr/bin/stat -f "%m" "$COOKIES" 2>/dev/null || true)"
fi

if ! "$YTDLP" --cookies-from-browser safari --cookies "$COOKIES" --skip-download "$URL" >/dev/null 2>&1; then
  echo "Cookie export failed (yt-dlp error)" >&2
  exit 1
fi

if [ ! -f "$COOKIES" ]; then
  echo "Cookie export failed (no output file)" >&2
  exit 1
fi

AFTER_MTIME="$(/usr/bin/stat -f "%m" "$COOKIES" 2>/dev/null || true)"
if [ -n "$BEFORE_MTIME" ] && [ "$BEFORE_MTIME" = "$AFTER_MTIME" ]; then
  echo "Cookie export may be stale (file mtime unchanged)" >&2
  exit 1
fi

echo "Cookies written to $COOKIES"