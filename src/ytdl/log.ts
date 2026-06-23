const { console, utils } = iina;

export const LOG_PATH = "@data/youtube-safari.log";

export function appendLog(message: string): void {
  const line = `[${new Date().toISOString()}] ${message}\n`;
  try {
    const path = utils.resolvePath(LOG_PATH);
    const { file } = iina;
    let existing = "";
    try {
      existing = file.read(path) || "";
    } catch {
      existing = "";
    }
    const trimmed = existing.length > 200_000 ? existing.slice(-120_000) : existing;
    file.write(path, trimmed + line);
  } catch (err) {
    console.log(`log write failed: ${err}`);
  }
}

export function getLogPath(): string {
  return utils.resolvePath(LOG_PATH);
}
