/** Coerce IINA player ids (number from createPlayerInstance, string from onMessage). */
export function normalizePlayerId(id: unknown): number | null {
  if (typeof id === "number" && Number.isFinite(id)) {
    return id;
  }
  if (typeof id === "string" && id.trim() !== "") {
    const trimmed = id.trim();
    const parsed = Number(trimmed);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
    const match = trimmed.match(/^(\d+)/);
    if (match) {
      const leading = Number(match[1]);
      return Number.isFinite(leading) ? leading : null;
    }
  }
  return null;
}