#!/usr/bin/env bash
# List YouTube playlist entries for a watch URL with ?list=...
# Outputs one JSON object on stdout: { title, entries: [{ id, title, url }] }
# Usage: list-playlist.sh URL [--cookies PATH] [--ytdlp PATH] [--limit N]
set -eo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
# shellcheck source=env.sh
source "$SCRIPT_DIR/env.sh"

URL=""
COOKIES="${COOKIES:-}"
YTDLP_IINA_OVERRIDE=""
LIMIT="100"

while [ $# -gt 0 ]; do
  case "$1" in
    --cookies)
      COOKIES="$2"
      shift 2
      ;;
    --ytdlp)
      YTDLP_IINA_OVERRIDE="$2"
      shift 2
      ;;
    --limit)
      LIMIT="$2"
      shift 2
      ;;
    --)
      shift
      [ -n "${1:-}" ] && URL="$1"
      break
      ;;
    *)
      if [ -z "$URL" ]; then
        URL="$1"
      fi
      shift
      ;;
  esac
done

[ -n "$URL" ] || { echo '{"error":"missing url"}' >&2; exit 2; }

YTDLP="${YTDLP:-/opt/homebrew/bin/yt-dlp}"
[ -x "$YTDLP" ] || YTDLP="/usr/local/bin/yt-dlp"
YTDLP_IINA="${YTDLP_IINA_OVERRIDE:-$HOME/Library/Application Support/com.colliderli.iina/yt-dlp-iina}"
COOKIES="${COOKIES:-$HOME/.config/yt-dlp/cookies.txt}"
PYTHON="${PYTHON:-/usr/bin/python3}"

ytdl() {
  local bin="$YTDLP"
  if [ -x "$YTDLP_IINA" ]; then
    bin="$YTDLP_IINA"
  fi
  local cookie_flags=()
  if [ -f "$COOKIES" ]; then
    cookie_flags=(--cookies "$COOKIES")
  fi
  "$bin" "${cookie_flags[@]}" "$@"
}

if ! ytdl --no-warnings --flat-playlist --dump-single-json --playlist-end "$LIMIT" -- "$URL" 2>/dev/null | "$PYTHON" -c '
import json, sys

data = json.load(sys.stdin)
title = data.get("title") or "YouTube Playlist"
entries = []
for item in data.get("entries") or []:
    if not item:
        continue
    video_id = item.get("id") or ""
    watch_url = item.get("url") or ""
    if not watch_url and video_id:
        watch_url = f"https://www.youtube.com/watch?v={video_id}"
    if not watch_url:
        continue
    entries.append({
        "id": video_id,
        "title": item.get("title") or "YouTube",
        "url": watch_url,
    })

if not entries:
    sys.exit(1)

print(json.dumps({
    "title": title,
    "entries": entries,
}, ensure_ascii=False, separators=(",", ":")))
'; then
  echo '{"error":"playlist listing failed"}' >&2
  exit 1
fi