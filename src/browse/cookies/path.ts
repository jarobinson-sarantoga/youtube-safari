const { file, preferences, utils } = iina;

export function cookiesPath(): string {
  const configured = preferences.get("cookies_path") as string | undefined;
  const fallback = "~/.config/yt-dlp/cookies.txt";
  return utils.resolvePath(configured || fallback);
}

export function cookiesFileExists(): boolean {
  return file.exists(cookiesPath());
}
