import { buildFormatString } from "../format";
import { pluginScriptPath } from "../plugin-script-path";
import { getSelectedHeight } from "../qualities";
import { commonYtdlpFlags } from "../ytdlp-script";

const RESOLVE_SCRIPT = "scripts/resolve.sh";
const PLAYLIST_SCRIPT = "scripts/list-playlist.sh";

export function resolveScriptPath(): string {
  return pluginScriptPath("resolve_script", RESOLVE_SCRIPT);
}

export function playlistScriptPath(): string {
  return pluginScriptPath("playlist_script", PLAYLIST_SCRIPT);
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
