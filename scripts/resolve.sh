#!/usr/bin/env bash
# Resolve a YouTube URL to stream URLs. Outputs one JSON object on stdout.
# Usage: resolve.sh URL [--cookies PATH] [--ytdlp PATH] [--format FMT]
set -eo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
# shellcheck source=env.sh
source "$SCRIPT_DIR/env.sh"

URL=""
COOKIES="${COOKIES:-}"
YTDLP_IINA_OVERRIDE=""
PRIMARY_FORMAT=""

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
    --format)
      PRIMARY_FORMAT="$2"
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

FORMATS=()
if [ -n "$PRIMARY_FORMAT" ]; then
  FORMATS+=("$PRIMARY_FORMAT")
fi
FORMATS+=(
  'bestvideo[height<=2160][vcodec^=av01]+bestaudio[ext=m4a]/bestvideo[height<=2160][vcodec^=vp9]+bestaudio[acodec^=opus]/bestvideo[height<=2160][vcodec^=avc1]+bestaudio[ext=m4a]/bestvideo[height<=2160]+bestaudio/best[height<=2160]/best'
  'bestvideo[height<=2160]+bestaudio/best[height<=2160]/best'
  'bestvideo+bestaudio/best'
  '18/best[ext=mp4][acodec!=none]/best'
  'best'
)

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

resolve_json() {
  local fmt="$1"
  ytdl --no-warnings --dump-single-json --no-playlist \
    --write-subs --write-auto-subs \
    --sub-langs "en,ja" --sub-format "vtt/best" \
    --format "$fmt" -- "$URL" 2>/dev/null | "$PYTHON" -c '
import json, sys
data = json.load(sys.stdin)
title = data.get("title") or "YouTube"
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

subtitles = []
requested_subs = data.get("requested_subtitles") or {}
for lang in ("en", "ja"):
    info = requested_subs.get(lang)
    if not info:
        continue
    url = info.get("url") or ""
    data_blob = info.get("data") or ""
    if not url and not data_blob:
        continue
    subtitles.append({
        "lang": lang,
        "ext": info.get("ext") or "vtt",
        "url": url,
        "data": data_blob,
        "name": info.get("name") or lang,
    })

requested = data.get("requested_formats") or []
video_url = ""
audio_url = ""
headers = {}
for track in requested:
    vcodec = track.get("vcodec")
    acodec = track.get("acodec")
    if vcodec == "none" or (acodec not in (None, "none") and vcodec in (None, "none")):
        audio_url = track.get("url") or audio_url
    elif vcodec not in (None, "none"):
        video_url = track.get("url") or ""
        headers = track.get("http_headers") or headers
if not video_url:
    video_url = data.get("url") or ""
    headers = data.get("http_headers") or headers
if not video_url:
    sys.exit(1)
ua = headers.get("User-Agent", "Mozilla/5.0")
print(json.dumps({
    "title": title,
    "description": description,
    "chapters": chapters,
    "subtitles": subtitles,
    "video": video_url,
    "audio": audio_url,
    "ua": ua,
}))
'
}

attempt_resolve() {
  local fmt out combined title description
  for fmt in "${FORMATS[@]}"; do
    if out="$(resolve_json "$fmt" 2>/dev/null)" && [ -n "$out" ]; then
      printf '%s\n' "$out"
      return 0
    fi
  done

  combined="$(ytdl --no-warnings --no-playlist -f "18/best" -g -- "$URL" 2>/dev/null | head -1)"
  if [ -n "$combined" ]; then
    title="$(ytdl --no-playlist --print "%(title)s" -- "$URL" 2>/dev/null || echo "YouTube")"
    description="$(ytdl --no-playlist --print "%(description)s" -- "$URL" 2>/dev/null || echo "")"
    "$PYTHON" -c 'import json,sys; print(json.dumps({"title":sys.argv[1],"description":sys.argv[2],"video":sys.argv[3],"audio":"","ua":"Mozilla/5.0"}))' "$title" "$description" "$combined"
    return 0
  fi
  return 1
}

attempt=1
max_attempts=3
while [ "$attempt" -le "$max_attempts" ]; do
  if attempt_resolve; then
    exit 0
  fi
  if [ "$attempt" -lt "$max_attempts" ]; then
    sleep 2
  fi
  attempt=$((attempt + 1))
done

echo '{"error":"resolution failed"}' >&2
exit 1