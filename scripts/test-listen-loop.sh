#!/usr/bin/env bash
# test-listen-loop.sh — rebuild + restart IINA + test Listen until pass or max attempts.
# Usage: test-listen-loop.sh [max_attempts] [YOUTUBE_URL]
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
MAX="${1:-8}"
URL="${2:-${TEST_URL:-https://www.youtube.com/watch?v=oxZeLM9rx7s}}"
KEEP_IINA=0
if [[ "${1:-}" == "--keep-iina" ]]; then
  KEEP_IINA=1
  MAX="${2:-8}"
  URL="${3:-${TEST_URL:-https://www.youtube.com/watch?v=oxZeLM9rx7s}}"
fi

cleanup_loop() {
  if [[ "$KEEP_IINA" -eq 0 ]]; then
    bash "$ROOT/scripts/close-iina.sh"
  fi
}
trap cleanup_loop EXIT

echo "=== test-listen-loop (max $MAX attempts) ==="

for attempt in $(seq 1 "$MAX"); do
  echo ""
  echo "######## Attempt $attempt / $MAX ########"
  listen_args=(--restart)
  if [[ "$KEEP_IINA" -eq 1 ]]; then
    listen_args+=(--keep-iina)
  fi
  if bash "$ROOT/scripts/test-listen.sh" "${listen_args[@]}" "$URL"; then
    echo ""
    echo "SUCCESS on attempt $attempt"
    exit 0
  fi
  echo "Attempt $attempt failed — retrying after rebuild…"
  sleep 2
done

echo ""
echo "FAILED after $MAX attempts" >&2
exit 1