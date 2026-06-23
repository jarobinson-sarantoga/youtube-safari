let pendingSeekSeconds: number | null = null;

export function setPendingSeek(seconds: number | null): void {
  if (typeof seconds === "number" && Number.isFinite(seconds) && seconds >= 0) {
    pendingSeekSeconds = seconds;
    return;
  }
  pendingSeekSeconds = null;
}

export function peekPendingSeek(): number | null {
  return pendingSeekSeconds;
}

export function takePendingSeek(): number | null {
  const seconds = pendingSeekSeconds;
  pendingSeekSeconds = null;
  return seconds;
}
