#!/usr/bin/env bash
# Fetch auto-generated or manual subtitles as VTT JSON.
# Usage: transcript.sh URL [--cookies PATH] [--ytdl PATH]
set -eo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
# shellcheck source=env.sh
source "$SCRIPT_DIR/env.sh"
# shellcheck source=lib/ytdlp-args.sh
source "$SCRIPT_DIR/lib/ytdlp-args.sh"
# shellcheck source=lib/ytdlp.sh
source "$SCRIPT_DIR/lib/ytdlp.sh"

parse_ytdlp_args "$@"
require_ytdlp_url
ytdlp_env_init

TMP_DIR="$(mktemp -d)"
trap 'rm -rf "$TMP_DIR"' EXIT

OUT_BASE="$TMP_DIR/sub"
if ! ytdl --no-warnings --no-playlist \
  --write-auto-subs --write-subs \
  --sub-langs "en.*,en" --sub-format "vtt/best" \
  --skip-download -o "$OUT_BASE" -- "$URL" 2>/dev/null; then
  "$PYTHON" -c 'import json; print(json.dumps({"error":"no subtitles"}))'
  exit 0
fi

VTT_FILE="$(find "$TMP_DIR" -name '*.vtt' | head -1)"
if [ -z "$VTT_FILE" ] || [ ! -f "$VTT_FILE" ]; then
  "$PYTHON" -c 'import json; print(json.dumps({"error":"no vtt file"}))'
  exit 0
fi

"$PYTHON" -c 'import json,sys; print(json.dumps({"vtt": open(sys.argv[1], encoding="utf-8", errors="replace").read()}))' "$VTT_FILE"
