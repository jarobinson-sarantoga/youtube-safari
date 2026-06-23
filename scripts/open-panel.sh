#!/usr/bin/env bash
# open-panel.sh — open the YouTube standalone panel (no playback).
set -euo pipefail

DATA_DIR="${HOME}/Library/Application Support/com.colliderli.iina/plugins/.data/com.jarobinson.youtube-safari"
mkdir -p "$DATA_DIR"
printf '1' > "$DATA_DIR/open-panel.pending"