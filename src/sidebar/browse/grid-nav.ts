export const SHORTS_GRID_COLUMNS = 2;

export function computeGridSelectionIndex(
  current: number,
  rowDelta: number,
  colDelta: number,
  itemCount: number,
  columns = SHORTS_GRID_COLUMNS,
): number | null {
  const row = Math.floor(current / columns);
  const col = current % columns;
  const nextCol = col + colDelta;
  if (nextCol < 0 || nextCol >= columns) {
    return null;
  }
  const nextIndex = (row + rowDelta) * columns + nextCol;
  if (nextIndex < 0 || nextIndex >= itemCount) {
    return null;
  }
  return nextIndex;
}

export function computeListSelectionIndex(
  current: number,
  delta: number,
  itemCount: number,
): number {
  if (itemCount <= 0) {
    return -1;
  }
  return Math.min(itemCount - 1, Math.max(0, current + delta));
}
