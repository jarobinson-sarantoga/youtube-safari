#!/usr/bin/env bash
# List available YouTube video metadata and qualities. Outputs one JSON object on stdout.
# Usage: list-formats.sh URL [--cookies PATH] [--ytdlp PATH]
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

attempt=1
max_attempts=3
while [ "$attempt" -le "$max_attempts" ]; do
  if ytdl --no-warnings --dump-json --no-playlist -- "$URL" 2>/dev/null \
    | "$PYTHON" "$SCRIPT_DIR/list-formats-parse.py"; then
    exit 0
  fi
  if [ "$attempt" -lt "$max_attempts" ]; then
    sleep 2
  fi
  attempt=$((attempt + 1))
done

echo '{"error":"format listing failed"}' >&2
exit 1
