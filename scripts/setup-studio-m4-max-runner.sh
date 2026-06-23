#!/usr/bin/env bash
# Register studio-m4-max for youtube-safari (third runner on same machine).
# LAN: 192.168.1.247 | Tailscale: 100.119.31.70
#
# Prereqs on studio-m4-max: IINA, ripgrep, Node 22, Safari cookies at
# ~/.config/yt-dlp/cookies.txt — run scripts/provision-runner.sh first.
#
# Usage from ~/actions-runner-youtube-safari after downloading the runner package:
#   GITHUB_TOKEN=<token> bash scripts/setup-studio-m4-max-runner.sh

set -euo pipefail

REPO="${SARANTOGA_REPO:-jarobinson-sarantoga/youtube-safari}"
TOKEN="${GITHUB_TOKEN:?Set GITHUB_TOKEN to the one-time registration token from GitHub}"
RUNNER_NAME="${RUNNER_NAME:-studio-m4-max-youtube-safari}"

./config.sh \
  --url "https://github.com/${REPO}" \
  --token "$TOKEN" \
  --name "$RUNNER_NAME" \
  --labels studio-m4-max,sarantoga,youtube-safari,native \
  --unattended

NODE_DIR="${HOME}/local/node-v22.16.0-darwin-arm64"
cat > .env <<EOF
PATH=${NODE_DIR}/bin:/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin
EOF

echo "Install and start the service:"
echo "  ./svc.sh install"
echo "  ./svc.sh start"
