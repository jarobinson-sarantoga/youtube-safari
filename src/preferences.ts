const { preferences } = iina;

export function getLastWatchUrl(): string {
  return (preferences.get("last_watch_url") as string | undefined) || "";
}