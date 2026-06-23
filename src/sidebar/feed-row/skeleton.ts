export function createSkeletonRows(count: number): HTMLElement {
  const wrap = document.createElement("div");
  wrap.className = "skeleton-rows";
  wrap.setAttribute("aria-hidden", "true");

  for (let i = 0; i < count; i++) {
    const row = document.createElement("div");
    row.className = "skeleton-row";

    const thumb = document.createElement("div");
    thumb.className = "skeleton-block skeleton-thumb";

    const lines = document.createElement("div");
    lines.className = "skeleton-lines";

    for (const cls of ["wide", "mid", "narrow"]) {
      const line = document.createElement("div");
      line.className = `skeleton-block skeleton-line ${cls}`;
      lines.appendChild(line);
    }

    row.appendChild(thumb);
    row.appendChild(lines);
    wrap.appendChild(row);
  }

  return wrap;
}
