#!/usr/bin/env bash
# test-listen-desktop.sh — UI test Listen via agent-desktop + log verification.
# Usage: test-listen-desktop.sh [--row N]
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
# shellcheck source=lib/plugin-log.sh
source "$SCRIPT_DIR/lib/plugin-log.sh"
# shellcheck source=lib/agent-desktop-test.sh
source "$SCRIPT_DIR/lib/agent-desktop-test.sh"

TIMEOUT="${TIMEOUT:-90}"
ROW=1
CLOSE_ON_EXIT=1
while [[ $# -gt 0 ]]; do
  case "$1" in
    --row) ROW="${2:-1}"; shift 2 ;;
    --keep-iina) CLOSE_ON_EXIT=0; shift ;;
    *) shift ;;
  esac
done

iina_test_cleanup() {
  if [[ "$CLOSE_ON_EXIT" -eq 1 ]]; then
    bash "$ROOT/scripts/close-iina.sh"
  fi
}
trap iina_test_cleanup EXIT

require_agent_desktop
if ! open_iina_youtube_panel; then
  echo "FAIL: YouTube panel did not open" >&2
  exit 1
fi

SNAP_JSON="$(agent-desktop snapshot --app IINA -i)"
SNAP_ID="$(printf '%s' "$SNAP_JSON" | rg -o '"snapshot_id":"[^"]+"' | head -1 | cut -d'"' -f4)"
REF="$(feed_row_ref_from_snapshot "$SNAP_JSON" "$ROW" "$SCRIPT_DIR")"
if [[ -z "$REF" ]]; then
  echo "FAIL: could not find feed row ref #$ROW in snapshot" >&2
  exit 1
fi

CLICK="$(listen_click_xy "$REF" "$SNAP_ID")" || {
  echo "FAIL: could not resolve hover Y for $REF" >&2
  exit 1
}
CLICK_X="${CLICK%% *}"
CLICK_Y="${CLICK#* }"

LOG_OFFSET="$(wc -l < "$PLUGIN_LOG" | tr -d ' ')"
echo "==> Click Listen on $REF at ${CLICK_X},${CLICK_Y} (snapshot $SNAP_ID)"
agent-desktop mouse-move --xy "${CLICK_X},${CLICK_Y}" >/dev/null
sleep 0.25
agent-desktop mouse-click --xy "${CLICK_X},${CLICK_Y}" >/dev/null

if ! wait_for_log_since "Background play: scheduling hide"; then
  echo "=== log since test ==="
  log_tail_since | rg -i "Open YouTube URL|openYouTubeWatch|Drained|Background play|Open YouTube in player|player window hidden" || true
  echo "RESULT: FAIL (no Background play: scheduling hide)" >&2
  exit 1
fi

echo "=== log since test ==="
log_tail_since | rg -i "Open YouTube URL|openYouTubeWatch|Drained|Background play|Open YouTube in player|player window hidden" || true

if log_tail_since | rg -q "Open YouTube URL:.*background"; then
  echo "PASS: background URL opened"
else
  echo "FAIL: missing background URL log" >&2
  exit 1
fi

if log_tail_since | rg -q "minimized|off-screen|Open YouTube in player"; then
  echo "PASS: playback started / hide attempted"
else
  echo "FAIL: hide/playback log incomplete" >&2
  exit 1
fi

echo "==> Waiting for resolve/open…"
resolve_rc=0
wait_for_log_since "Resolved:|Opened:" "ignored during shutdown|on_load aborted" || resolve_rc=$?
case "$resolve_rc" in
  0)
    log_tail_since | rg "Resolved:|Opened:" | tail -2
    echo "PASS: stream resolved and opened"
    ;;
  2)
    echo "FAIL: playback aborted during load" >&2
    log_tail_since | rg -i "shutdown|aborted|ignored" || true
    exit 1
    ;;
  *)
    echo "FAIL: no Resolved/Opened in log (audio likely not playing)" >&2
    exit 1
    ;;
esac

echo "==> Verifying player window minimized…"
sleep 1
if [[ "$(iina_background_player_minimized)" != "true" ]]; then
  echo "FAIL: background player window not minimized" >&2
  exit 1
fi
echo "PASS: background player window minimized (Dock only)"
if log_tail_since | rg -q "minimized|off-screen|hide complete"; then
  echo "PASS: hide strategy applied in log"
else
  echo "FAIL: no successful hide strategy in log" >&2
  exit 1
fi

echo "RESULT: PASS (agent-desktop Listen)"
exit 0
