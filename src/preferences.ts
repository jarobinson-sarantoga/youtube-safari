const { preferences } = iina;

export function getLastWatchUrl(): string {
  return (preferences.get("last_watch_url") as string | undefined) || "";
}

export function isSponsorBlockEnabled(): boolean {
  return preferences.get("sponsorblock_enabled") !== false;
}

export function isHideShortsEnabled(): boolean {
  return preferences.get("hide_shorts") === true;
}

export function isHideRelatedEnabled(): boolean {
  return preferences.get("hide_related") === true;
}

export function isAutoQueueEnabled(): boolean {
  return preferences.get("auto_queue") !== false;
}

export function getDefaultPlaybackSpeed(): number {
  const value = Number(preferences.get("default_playback_speed"));
  return Number.isFinite(value) && value > 0 ? value : 1;
}

export function getSearchDurationFilter(): string {
  const value = preferences.get("search_duration_filter");
  return typeof value === "string" ? value : "any";
}
