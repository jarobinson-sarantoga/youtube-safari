export function createShortsGridSkeleton(count = 4): HTMLElement {
  const wrap = document.createElement("div");
  wrap.className = "skeleton-shorts-grid";
  wrap.setAttribute("aria-hidden", "true");

  for (let i = 0; i < count; i += 1) {
    const card = document.createElement("div");
    card.className = "skeleton-shorts-card";
    const thumb = document.createElement("div");
    thumb.className = "skeleton-block skeleton-shorts-thumb";
    card.appendChild(thumb);
    wrap.appendChild(card);
  }

  return wrap;
}
