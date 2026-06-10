#!/usr/bin/env bash
# IINA's utils.exec only sets LC_ALL=en_US.UTF-8 — no HOME or PATH.
# Source this at the top of any script called from the plugin.

if [ -z "${HOME:-}" ]; then
  HOME="$(/usr/bin/python3 -c 'import os,pwd; print(pwd.getpwuid(os.getuid()).pw_dir)' 2>/dev/null || true)"
  if [ -z "$HOME" ]; then
    USER_NAME="$(/usr/bin/id -un 2>/dev/null || true)"
    if [ -n "$USER_NAME" ]; then
      HOME="$(/usr/bin/dscl . -read "/Users/$USER_NAME" NFSHomeDirectory 2>/dev/null | /usr/bin/awk '{print $2}')"
    fi
  fi
  if [ -z "$HOME" ]; then
    echo "env.sh: cannot determine HOME" >&2
    exit 1
  fi
  export HOME
fi

export PATH="/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin"
export LC_ALL="${LC_ALL:-en_US.UTF-8}"