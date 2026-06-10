import { appendLog } from "./ytdl";

const { preferences, utils } = iina;

function prefPath(key: string): string {
  const value = preferences.get(key) as string;
  return utils.resolvePath(value);
}

/** Shared `--cookies` / `--ytdlp` argv pairs from plugin preferences. */
export function commonYtdlpFlags(): string[] {
  const args: string[] = [];

  const cookies = preferences.get("cookies_path") as string | undefined;
  if (cookies) {
    args.push("--cookies", prefPath("cookies_path"));
  }

  const ytdlp = preferences.get("ytdl_path") as string | undefined;
  if (ytdlp) {
    args.push("--ytdlp", prefPath("ytdl_path"));
  }

  return args;
}

export interface BashJsonLineResult<T> {
  ok: boolean;
  data?: T;
  error?: string;
  status?: number;
  stdout?: string;
  stderr?: string;
}

/**
 * Run `/bin/bash` with script argv, parse the last stdout line as JSON.
 * Logs failures the same way as the previous ytdl/qualities inline runners.
 */
export async function execBashJsonLine<T>(
  bashArgs: string[],
  logLabel: string,
): Promise<BashJsonLineResult<T>> {
  const script = bashArgs[0] || "";
  if (!utils.fileInPath(script)) {
    const error = `${logLabel} script not found: ${script}`;
    appendLog(error);
    return { ok: false, error };
  }

  appendLog(`${logLabel}: ${["/bin/bash", ...bashArgs].join(" ")}`);
  const result = await utils.exec("/bin/bash", bashArgs);

  if (result.status !== 0) {
    const message = result.stderr || result.stdout || `exit ${result.status}`;
    appendLog(`${logLabel} failed (${result.status}): ${message}`);
    return {
      ok: false,
      error: message.trim() || `exit ${result.status}`,
      status: result.status,
      stdout: result.stdout,
      stderr: result.stderr,
    };
  }

  const line = result.stdout.trim().split("\n").pop() || "";
  try {
    const data = JSON.parse(line) as T;
    return { ok: true, data, stdout: result.stdout, stderr: result.stderr };
  } catch (err) {
    const message = `JSON parse error: ${err}`;
    appendLog(`${logLabel} ${message}; stdout=${result.stdout.slice(0, 200)}`);
    return {
      ok: false,
      error: message,
      stdout: result.stdout,
      stderr: result.stderr,
    };
  }
}