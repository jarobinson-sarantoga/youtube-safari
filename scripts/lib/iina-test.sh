# IINA lifecycle helpers for integration tests.

iina_test_cleanup() {
  if [[ "${CLOSE_ON_EXIT:-1}" -eq 1 ]]; then
    bash "$ROOT/scripts/close-iina.sh"
  fi
}

restart_iina() {
  echo "==> Restarting IINA…"
  bash "$ROOT/scripts/close-iina.sh" --quiet
  open -a IINA
  echo "==> Waiting for plugin global entry…"
  if ! wait_for_log "Global entry loaded" tail; then
    echo "FAIL: Global entry did not load within ${TIMEOUT}s" >&2
    tail -n 30 "$PLUGIN_LOG" >&2 || true
    return 1
  fi
  sleep 1
}

ensure_iina_running() {
  if ! pgrep -qx IINA; then
    open -a IINA
    wait_for_log "Global entry loaded" tail || {
      echo "FAIL: IINA started but global entry missing" >&2
      return 1
    }
  fi
}
