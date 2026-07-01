/** Feed list ARIA role + portrait layout helpers for Shorts vs standard feeds. */
export function feedListA11y(
  grid: boolean,
  listbox: boolean,
): { role: string; label: string } {
  if (grid) {
    return { role: "grid", label: "Shorts feed" };
  }
  if (listbox) {
    return { role: "listbox", label: "Video feed" };
  }
  return { role: "list", label: "Video feed" };
}

export function usePortraitRows(tab: string, subsFilter: string): boolean {
  return tab === "shorts" || (tab === "subscriptions" && subsFilter === "shorts");
}
