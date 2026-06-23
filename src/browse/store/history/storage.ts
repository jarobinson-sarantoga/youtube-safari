import { appendLog } from "../../../ytdl";
import {
  DISK_FLUSH_MS,
  type HistoryFile,
  HISTORY_PATH,
} from "./types";

const { file } = iina;

let historyData: HistoryFile | null = null;
let historyHydrated = false;
let historyDirty = false;
let historyFlushTimer: ReturnType<typeof setTimeout> | null = null;

function readHistoryFromDisk(): HistoryFile {
  if (!file.exists(HISTORY_PATH)) {
    return { entries: [] };
  }
  try {
    const raw = file.read(HISTORY_PATH);
    if (!raw) {
      return { entries: [] };
    }
    const parsed = JSON.parse(raw) as HistoryFile;
    if (Array.isArray(parsed.entries)) {
      return parsed;
    }
  } catch (err) {
    appendLog(`history read error: ${err}`);
  }
  return { entries: [] };
}

function writeHistoryToDisk(data: HistoryFile): void {
  try {
    file.write(HISTORY_PATH, JSON.stringify(data, null, 2));
  } catch (err) {
    appendLog(`history write error: ${err}`);
  }
}

function hydrateHistory(): void {
  if (historyHydrated) {
    return;
  }
  historyHydrated = true;
  historyData = readHistoryFromDisk();
}

export function getHistoryData(): HistoryFile {
  hydrateHistory();
  return historyData!;
}

function scheduleHistoryFlush(): void {
  historyDirty = true;
  if (historyFlushTimer !== null) {
    return;
  }
  historyFlushTimer = setTimeout(() => {
    historyFlushTimer = null;
    flushHistoryToDisk();
  }, DISK_FLUSH_MS);
}

export function flushHistoryToDisk(): void {
  if (historyFlushTimer !== null) {
    clearTimeout(historyFlushTimer);
    historyFlushTimer = null;
  }
  if (!historyDirty || !historyData) {
    return;
  }
  historyDirty = false;
  writeHistoryToDisk(historyData);
}

export function writeHistory(data: HistoryFile): void {
  historyData = data;
  historyHydrated = true;
  scheduleHistoryFlush();
}
