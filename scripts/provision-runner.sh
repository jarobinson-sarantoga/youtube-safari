#!/usr/bin/env bash
# Preflight checks for studio-m4-max CI runner (IINA plugin audit).
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
FAIL=0

check() {
  local name="$1"
  shift
  if "$@" >/dev/null 2>&1; then
    echo "OK: $name"
  else
    echo "MISSING: $name" >&2
    FAIL=$((FAIL + 1))
  fi
}

echo "=== youtube-safari runner provisioning ==="

check "IINA installed" test -x "/Applications/IINA.app/Contents/MacOS/iina-plugin"
check "ripgrep on PATH" command -v rg
check "node on PATH" command -v node
check "npm on PATH" command -v npm
check "cookies readable" test -r "$HOME/.config/yt-dlp/cookies.txt"
check "yt-dlp-iina binary" \
  test -x "$HOME/Library/Application Support/com.colliderli.iina/yt-dlp-iina"

NODE_MAJOR="$(node -p 'process.versions.node.split(".")[0]' 2>/dev/null || echo 0)"
if [[ "$NODE_MAJOR" -ge 22 ]]; then
  echo "OK: Node major version ($NODE_MAJOR)"
else
  echo "MISSING: Node 22+ (found major $NODE_MAJOR)" >&2
  FAIL=$((FAIL + 1))
fi

if [[ "$FAIL" -eq 0 ]]; then
  echo ""
  echo "Runner host is ready. Register with:"
  echo "  cd ~/actions-runner-youtube-safari"
  echo "  GITHUB_TOKEN=<token> bash $ROOT/scripts/setup-studio-m4-max-runner.sh"
  echo ""
  echo "Validate audit locally:"
  echo "  cd $ROOT && bash scripts/install.sh && bash scripts/audit.sh"
  exit 0
fi

echo ""
echo "$FAIL check(s) failed. Fix before registering the GitHub Actions runner."
echo "Cookies: bash $ROOT/scripts/refresh-cookies.sh (Safari + Full Disk Access required)"
exit 1
