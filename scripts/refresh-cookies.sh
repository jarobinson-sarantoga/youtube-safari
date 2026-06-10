#!/usr/bin/env bash
# Export YouTube cookies from Safari for yt-dlp.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
# shellcheck source=env.sh
source "$SCRIPT_DIR/env.sh"

find_ytdlp() {
  local candidates=(
    "${YTDLP:-}"
    "$(command -v yt-dlp 2>/dev/null || true)"
    "/opt/homebrew/bin/yt-dlp"
    "/usr/local/bin/yt-dlp"
    "$HOME/Library/Application Support/com.colliderli.iina/yt-dlp-iina"
  )
  local c
  for c in "${candidates[@]}"; do
    if [ -n "$c" ] && [ -x "$c" ]; then
      echo "$c"
      return 0
    fi
  done
  return 1
}

if ! YTDLP_BIN="$(find_ytdlp)"; then
  echo "Cookie export failed: yt-dlp not found" >&2
  echo "Install with: brew install yt-dlp" >&2
  exit 1
fi

COOKIES="${COOKIES:-$HOME/.config/yt-dlp/cookies.txt}"
URL="${1:-https://www.youtube.com/watch?v=jNQXAC9IVRw}"

mkdir -p "$(dirname "$COOKIES")"
BEFORE_SIZE=""
if [ -f "$COOKIES" ]; then
  BEFORE_SIZE="$(wc -c < "$COOKIES" | tr -d ' ')"
fi

ERR_FILE="$(mktemp)"
TMP_COOKIES="$(mktemp)"
rm -f "$TMP_COOKIES"
trap 'rm -f "$ERR_FILE" "$TMP_COOKIES"' EXIT

if ! "$YTDLP_BIN" --cookies-from-browser safari --cookies "$TMP_COOKIES" --skip-download "$URL" 2>"$ERR_FILE" >/dev/null; then
  echo "Cookie export failed (yt-dlp error):" >&2
  sed 's/^/  /' "$ERR_FILE" >&2
  if grep -qiE "could not copy|keychain|permission|Operation not permitted|denied" "$ERR_FILE" 2>/dev/null; then
    echo "" >&2
    echo "Safari cookies may be blocked. Grant Full Disk Access to IINA:" >&2
    echo "  System Settings → Privacy & Security → Full Disk Access → IINA" >&2
    echo "Then quit Safari, reopen youtube.com, and run this script again." >&2
  fi
  exit 1
fi

if [ ! -s "$TMP_COOKIES" ]; then
  echo "Cookie export failed: cookies file missing or empty" >&2
  exit 1
fi

if ! grep -qE '^\.youtube\.com\t.*\t(LOGIN_INFO|__Secure-1PSID)\t' "$TMP_COOKIES"; then
  echo "Warning: exported cookies may be missing YouTube login (no LOGIN_INFO or __Secure-1PSID on .youtube.com)" >&2
fi

mv -f "$TMP_COOKIES" "$COOKIES"

AFTER_SIZE="$(wc -c < "$COOKIES" | tr -d ' ')"
if [ -n "$BEFORE_SIZE" ] && [ "$BEFORE_SIZE" = "$AFTER_SIZE" ]; then
  echo "Note: cookie file size unchanged (content may still have been refreshed)." >&2
fi

echo "Cookies written to $COOKIES ($AFTER_SIZE bytes)"