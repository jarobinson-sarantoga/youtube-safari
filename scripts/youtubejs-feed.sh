#!/usr/bin/env bash
# Fetch browse feeds via YouTube.js. Outputs one JSON object on stdout.
# Usage: youtubejs-feed.sh --tab home [--cookies PATH] [--query Q] [--video-id ID] [--limit N]
set -eo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
# shellcheck source=env.sh
source "$SCRIPT_DIR/env.sh"

find_node() {
  local candidates=(
    "${NODE:-}"
    "/opt/homebrew/bin/node"
    "/usr/local/bin/node"
    "/usr/bin/node"
  )

  if [ -d "$HOME/.nvm/versions/node" ]; then
    local version
    version="$(ls -1 "$HOME/.nvm/versions/node" 2>/dev/null | sort -V | tail -1 || true)"
    if [ -n "$version" ] && [ -x "$HOME/.nvm/versions/node/$version/bin/node" ]; then
      candidates+=("$HOME/.nvm/versions/node/$version/bin/node")
    fi
  fi

  local candidate
  for candidate in "${candidates[@]}"; do
    if [ -n "$candidate" ] && [ -x "$candidate" ]; then
      echo "$candidate"
      return 0
    fi
  done

  return 1
}

if ! NODE_BIN="$(find_node)"; then
  echo '{"items":[],"error":"node not found — install Node (brew install node) or set NODE in env"}' >&2
  exit 127
fi

exec "$NODE_BIN" "$SCRIPT_DIR/youtubejs-feed.mjs" "$@"