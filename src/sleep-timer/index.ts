import { appendLog } from "../ytdl";

const { core, mpv } = iina;

let sleepTimer: ReturnType<typeof setTimeout> | null = null;
let sleepEndsAt = 0;

export function cancelSleepTimer(): void {
  if (sleepTimer !== null) {
    clearTimeout(sleepTimer);
    sleepTimer = null;
  }
  sleepEndsAt = 0;
}

export function getSleepTimerEndsAt(): number {
  return sleepEndsAt;
}

export function startSleepTimer(minutes: number): number {
  cancelSleepTimer();
  if (!Number.isFinite(minutes) || minutes <= 0) {
    return 0;
  }
  const ms = Math.min(minutes, 480) * 60_000;
  sleepEndsAt = Date.now() + ms;
  sleepTimer = setTimeout(() => {
    sleepTimer = null;
    sleepEndsAt = 0;
    appendLog("Sleep timer fired — pausing playback");
    try {
      mpv.set("pause", "yes");
      core.osd("Sleep timer — playback paused");
    } catch (err) {
      appendLog(`Sleep timer pause failed: ${err}`);
    }
  }, ms);
  appendLog(`Sleep timer set for ${minutes} min`);
  return sleepEndsAt;
}
