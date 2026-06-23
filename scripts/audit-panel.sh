#!/usr/bin/env bash
# Semantic audit for the YouTube sidebar panel (HTML/CSS/JS wiring).
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

PASS=0
FAIL=0

pass() { echo "PASS: $1"; PASS=$((PASS + 1)); }
fail() { echo "FAIL: $1"; FAIL=$((FAIL + 1)); }

# shellcheck source=scripts/lib/audit-panel-assets.sh
source "$ROOT/scripts/lib/audit-panel-assets.sh"
# shellcheck source=scripts/lib/audit-panel-messages.sh
source "$ROOT/scripts/lib/audit-panel-messages.sh"
# shellcheck source=scripts/lib/audit-panel-global.sh
source "$ROOT/scripts/lib/audit-panel-global.sh"
# shellcheck source=scripts/lib/audit-panel-feed.sh
source "$ROOT/scripts/lib/audit-panel-feed.sh"

echo "=== youtube-safari panel audit ==="

audit_panel_assets
audit_panel_messages
audit_panel_build
audit_panel_browse_ui
audit_panel_global
audit_panel_feed

echo "---"
echo "Passed: $PASS  Failed: $FAIL"
[[ "$FAIL" -eq 0 ]]
