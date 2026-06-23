import { buildFormatString } from "../format";
import { getSelectedHeight } from "../qualities";
import { commonYtdlpFlags } from "../ytdlp-script";

const { preferences, utils } = iina;

const RESOLVE_SCRIPT = "scripts/resolve.sh";
const PLAYLIST_SCRIPT = "scripts/list-playlist.sh";

export function resolveScriptPath(): string {
  const configured = preferences.get("resolve_script") as string | undefined;
  const candidate = configured || RESOLVE_SCRIPT;
  return utils.resolvePath(candidate);
}

export function playlistScriptPath(): string {
  const configured = preferences.get("playlist_script") as string | undefined;
  const candidate = configured || PLAYLIST_SCRIPT;
  return utils.resolvePath(candidate);
}

export function buildResolveArgs(url: string): string[] {
  return [
    resolveScriptPath(),
    url,
    ...commonYtdlpFlags(),
    "--format",
    buildFormatString(getSelectedHeight()),
  ];
}

export function buildPlaylistArgs(url: string): string[] {
  return [playlistScriptPath(), url, ...commonYtdlpFlags()];
}
