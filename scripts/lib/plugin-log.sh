# Plugin log helpers for Listen integration tests.

PLUGIN_LOG="${HOME}/Library/Application Support/com.colliderli.iina/plugins/.data/com.jarobinson-sarantoga.youtube-safari/youtube-safari.log"
PLUGIN_DATA_DIR="${HOME}/Library/Application Support/com.colliderli.iina/plugins/.data/com.jarobinson-sarantoga.youtube-safari"
LOG_OFFSET=0

plugin_log_init() {
  mkdir -p "$PLUGIN_DATA_DIR"
  touch "$PLUGIN_LOG"
}

log_since() {
  tail -n +"$((LOG_OFFSET + 1))" "$PLUGIN_LOG" 2>/dev/null || tail -n 500 "$PLUGIN_LOG"
}

log_tail_since() {
  tail -n +"$((LOG_OFFSET + 1))" "$PLUGIN_LOG"
}

wait_for_log() {
  local pattern="$1"
  local scope="${2:-since}"
  local deadline=$((SECONDS + TIMEOUT))
  while (( SECONDS < deadline )); do
    if [[ "$scope" == "tail" ]]; then
      tail -n 80 "$PLUGIN_LOG" | rg -q "$pattern" && return 0
    elif log_since | rg -q "$pattern"; then
      return 0
    fi
    sleep 0.5
  done
  return 1
}

check_marker() {
  local name="$1"
  local pattern="$2"
  if log_since | rg -q "$pattern"; then
    echo "PASS: $name"
    log_since | rg "$pattern" | tail -1
    return 0
  fi
  echo "FAIL: $name (pattern: $pattern)" >&2
  FAILURES+=("$name")
  return 1
}

wait_for_log_since() {
  local pattern="$1"
  local abort="${2:-}"
  local deadline=$((SECONDS + TIMEOUT))
  while (( SECONDS < deadline )); do
    if log_tail_since | rg -q "$pattern"; then
      return 0
    fi
    if [ -n "$abort" ] && log_tail_since | rg -q "$abort"; then
      return 2
    fi
    sleep 0.5
  done
  return 1
}
