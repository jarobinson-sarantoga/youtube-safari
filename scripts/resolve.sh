#!/usr/bin/env bash
# Resolve a YouTube URL to stream URLs. Outputs one JSON object on stdout.
# Usage: resolve.sh URL [--cookies PATH] [--ytdlp PATH] [--format FMT]
set -eo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
# shellcheck source=env.sh
source "$SCRIPT_DIR/env.sh"
# shellcheck source=lib/ytdlp-args.sh
source "$SCRIPT_DIR/lib/ytdlp-args.sh"
# shellcheck source=lib/ytdlp.sh
source "$SCRIPT_DIR/lib/ytdlp.sh"

parse_ytdlp_args --format "$@"
require_ytdlp_url
ytdlp_env_init

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

resolve_json() {
  local fmt="$1"
  ytdl --no-warnings --dump-single-json --no-playlist \
    --write-subs --write-auto-subs \
    --sub-langs "en,ja" --sub-format "vtt/best" \
    --format "$fmt" -- "$URL" 2>/dev/null | "$PYTHON" "$SCRIPT_DIR/resolve-parse.py"
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
