# Parse URL and yt-dlp flags shared by resolve.sh and list-formats.sh.

URL=""
COOKIES="${COOKIES:-}"
YTDLP_IINA_OVERRIDE=""
PRIMARY_FORMAT=""

parse_ytdlp_args() {
  local with_format=0
  if [ "${1:-}" = "--format" ]; then
    with_format=1
    shift
  fi

  while [ $# -gt 0 ]; do
    case "$1" in
      --cookies)
        COOKIES="$2"
        shift 2
        ;;
      --ytdlp)
        YTDLP_IINA_OVERRIDE="$2"
        shift 2
        ;;
      --format)
        [ "$with_format" -eq 1 ] || { echo '{"error":"unexpected --format"}' >&2; exit 2; }
        PRIMARY_FORMAT="$2"
        shift 2
        ;;
      --)
        shift
        [ -n "${1:-}" ] && URL="$1"
        break
        ;;
      *)
        if [ -z "$URL" ]; then
          URL="$1"
        fi
        shift
        ;;
    esac
  done
}

require_ytdlp_url() {
  [ -n "$URL" ] || { echo '{"error":"missing url"}' >&2; exit 2; }
}
