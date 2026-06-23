/** Roving tabindex + arrow/Home/End keyboard navigation for tablists and radiogroups. */

export type ArrowNavHandle = { syncTabindex: () => void };

export function bindArrowNav(options: {
  container: HTMLElement;
  itemSelector: string;
  getActiveIndex: () => number;
  onMove: (index: number) => void;
  rovingTabindex?: boolean;
}): ArrowNavHandle {
  const getItems = () =>
    [...options.container.querySelectorAll<HTMLElement>(options.itemSelector)];

  const syncTabindex = () => {
    if (!options.rovingTabindex) {
      return;
    }
    const active = options.getActiveIndex();
    getItems().forEach((el, index) => {
      el.tabIndex = index === active ? 0 : -1;
    });
  };

  options.container.addEventListener("keydown", (event) => {
    if (
      event.key !== "ArrowLeft" &&
      event.key !== "ArrowRight" &&
      event.key !== "Home" &&
      event.key !== "End"
    ) {
      return;
    }

    const items = getItems();
    const current = options.getActiveIndex();
    if (!items.length || current < 0) {
      return;
    }

    event.preventDefault();
    let next = current;
    if (event.key === "ArrowLeft") {
      next = current - 1;
    } else if (event.key === "ArrowRight") {
      next = current + 1;
    } else if (event.key === "Home") {
      next = 0;
    } else {
      next = items.length - 1;
    }

    if (next < 0 || next >= items.length) {
      return;
    }

    options.onMove(next);
    syncTabindex();
    items[next]?.focus();
  });

  syncTabindex();
  return { syncTabindex };
}
