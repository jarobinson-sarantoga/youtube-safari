#!/usr/bin/env bash
# Resolve a YouTube URL without opening IINA (diagnostics).
# Usage: test-url.sh URL
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
URL="${1:-}"
[ -n "$URL" ] || { echo "usage: test-url.sh URL" >&2; exit 2; }

COOKIES="${COOKIES:-$HOME/.config/yt-dlp/cookies.txt}"
YTDLP_IINA="$HOME/Library/Application Support/com.colliderli.iina/yt-dlp-iina"
FORMAT='bestvideo[height<=2160][vcodec^=av01]+bestaudio[ext=m4a]/bestvideo[height<=2160][vcodec^=vp9]+bestaudio[acodec^=opus]/bestvideo[height<=2160][vcodec^=avc1]+bestaudio[ext=m4a]/bestvideo[height<=2160]+bestaudio/best[height<=2160]/best'

args=("$ROOT/scripts/resolve.sh" "$URL")
[ -f "$COOKIES" ] && args+=(--cookies "$COOKIES")
[ -x "$YTDLP_IINA" ] && args+=(--ytdlp "$YTDLP_IINA")
args+=(--format "$FORMAT")

line="$(env -i LC_ALL=en_US.UTF-8 /bin/bash "${args[@]}" 2>/dev/null | tail -1)"
python3 - "$line" <<'PY'
import json, re, sys
payload = json.loads(sys.argv[1])
title = payload.get("title") or "?"
video = payload.get("video") or ""
audio = payload.get("audio") or ""
itag = re.search(r"itag=(\d+)", video)
host = re.search(r"https?://([^/]+)", video)
print(f"title: {title}")
print(f"video: {host.group(1) if host else '?'} itag={itag.group(1) if itag else '?'}")
print(f"audio: {'split' if audio else 'muxed'}")
print(f"chapters: {len(payload.get('chapters') or [])}")
print(f"subs: {', '.join(s.get('lang', '') for s in (payload.get('subtitles') or [])) or 'none'}")
PY