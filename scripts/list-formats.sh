#!/usr/bin/env bash
# List available YouTube video metadata and qualities. Outputs one JSON object on stdout.
# Usage: list-formats.sh URL [--cookies PATH] [--ytdlp PATH]
set -eo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
# shellcheck source=env.sh
source "$SCRIPT_DIR/env.sh"

URL=""
COOKIES="${COOKIES:-}"
YTDLP_IINA_OVERRIDE=""

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

if ! ytdl --no-warnings --dump-json --no-playlist -- "$URL" 2>/dev/null | "$PYTHON" -c '
import json, sys

MAX_HEIGHT = 2160

def label_for(height: int) -> str:
    if height == 2160:
        return "4K (2160p)"
    return f"{height}p"

data = json.load(sys.stdin)
title = data.get("title") or ""
description = data.get("description") or ""

def fmt_time(seconds: float) -> str:
    s = int(seconds)
    h = s // 3600
    m = (s % 3600) // 60
    sec = s % 60
    if h > 0:
        return f"{h}:{m:02d}:{sec:02d}"
    return f"{m:02d}:{sec:02d}"

def parse_desc_chapters(desc: str):
    import re
    chapters = []
    for line in desc.splitlines():
        trimmed = line.strip()
        if not trimmed:
            continue
        match = re.match(r"^[\s•\-*]*(\d{1,2}:\d{2}(?::\d{2})?)\s+(.+)$", trimmed)
        if not match:
            continue
        parts = match.group(1).split(":")
        nums = [int(p) for p in parts]
        if len(nums) == 3:
            seconds = nums[0] * 3600 + nums[1] * 60 + nums[2]
        else:
            seconds = nums[0] * 60 + nums[1]
        chapters.append({
            "seconds": seconds,
            "timestamp": match.group(1),
            "label": match.group(2).strip(),
        })
    return chapters

chapters = []
for ch in data.get("chapters") or []:
    start = ch.get("start_time")
    label = (ch.get("title") or "").strip()
    if start is None or not label:
        continue
    seconds = int(start)
    chapters.append({
        "seconds": seconds,
        "timestamp": fmt_time(seconds),
        "label": label,
    })
if not chapters and description:
    chapters = parse_desc_chapters(description)

formats = data.get("formats") or []
heights = set()
for fmt in formats:
    vcodec = fmt.get("vcodec")
    if vcodec in (None, "none"):
        continue
    height = fmt.get("height")
    if not height or height <= 0:
        continue
    if height > MAX_HEIGHT:
        continue
    heights.add(int(height))

qualities = [
    {"height": h, "label": label_for(h)}
    for h in sorted(heights, reverse=True)
]
print(json.dumps({
    "title": title,
    "description": description,
    "chapters": chapters,
    "qualities": qualities,
}, ensure_ascii=False, separators=(",", ":")))
'; then
  echo '{"error":"format listing failed"}' >&2
  exit 1
fi