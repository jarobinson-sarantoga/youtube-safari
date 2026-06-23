# Shared yt-dlp paths and wrapper. Source after env.sh; set COOKIES before ytdlp_env_init.

ytdlp_env_init() {
  YTDLP="${YTDLP:-/opt/homebrew/bin/yt-dlp}"
  [ -x "$YTDLP" ] || YTDLP="/usr/local/bin/yt-dlp"
  YTDLP_IINA="${YTDLP_IINA_OVERRIDE:-$HOME/Library/Application Support/com.colliderli.iina/yt-dlp-iina}"
  COOKIES="${COOKIES:-$HOME/.config/yt-dlp/cookies.txt}"
  PYTHON="${PYTHON:-/usr/bin/python3}"
}

ytdl() {
  local bin="$YTDLP"
  if [ -x "$YTDLP_IINA" ]; then
    bin="$YTDLP_IINA"
  fi
  local cookie_flags=()
  if [ -f "$COOKIES" ]; then
    cookie_flags=(--cookies "$COOKIES")
  fi
  "$bin" "${cookie_flags[@]}" "$@"
}
