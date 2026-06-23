# Journey log wait helpers (abort on shutdown).

wait_log() {
  local pattern="$1"
  local label="$2"
  local deadline=$((SECONDS + TIMEOUT))
  while (( SECONDS < deadline )); do
    if log_since | rg -q "$pattern"; then
      return 0
    fi
    if log_since | rg -q "on_load aborted: player shutting down|Open URL ignored during shutdown"; then
      fail "playback aborted during $label"
    fi
    sleep 0.5
  done
  fail "timeout waiting for $label ($pattern)"
}
