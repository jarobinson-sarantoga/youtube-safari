export function clampQueueStartIndex(startIndex: number, length: number): number {
  if (length <= 0) {
    return 0;
  }
  return Math.min(Math.max(startIndex, 0), length - 1);
}
