#!/usr/bin/env bash
# Build a distributable .iinaplgz for IINA (open in IINA to install).
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

VERSION="$(node -p "require('./Info.json').version")"
OUT_DIR="${1:-$ROOT/release}"
OUT_FILE="$OUT_DIR/youtube-safari-${VERSION}.iinaplgz"
STAGE="$(mktemp -d)/youtube-safari"

cleanup() { rm -rf "$(dirname "$STAGE")"; }
trap cleanup EXIT

echo "==> Building plugin bundles"
npm run build

echo "==> Staging runtime package"
mkdir -p "$STAGE" "$OUT_DIR"
cp Info.json pref.html pref.css package.json package-lock.json "$STAGE/"
cp -R dist sidebar scripts "$STAGE/"

echo "==> Installing production dependencies"
( cd "$STAGE" && npm ci --omit=dev --silent )

echo "==> Creating $OUT_FILE"
rm -f "$OUT_FILE"
( cd "$STAGE" && zip -r -q "$OUT_FILE" . -x '*.DS_Store' )

BYTES="$(wc -c < "$OUT_FILE" | tr -d ' ')"
echo "    wrote $OUT_FILE ($BYTES bytes)"
echo "    install: open the file in IINA, or drag it onto the IINA icon"
