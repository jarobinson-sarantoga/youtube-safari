import { normalizePlayerId } from "./player-id";
import { isYouTubeWatchURL, normalizeMediaURL } from "./youtube";
import { appendLog } from "./ytdl";

let playGeneration = 0;

export function bumpPlayGeneration(): number {
  playGeneration += 1;
  return playGeneration;
}

export function getPlayGeneration(): number {
  return playGeneration;
}

const { file, global, utils } = iina;

const OPEN_URL_QUEUE = "@data/open-url.pending";
const managedPlayerIds = new Set<number>();
const managedPlayerBackground = new Map<number, boolean>();

export type PlayerCoordinator = {
  getActivePlayerId: () => number | null;
  setActivePlayerId: (id: number | null) => void;
  isPlayerConfirmedReady: () => boolean;
  setPlayerConfirmedReady: (ready: boolean) => void;
  getLivePlayerCount?: () => number;
};

export type OpenYouTubeWatchOptions = {
  background?: boolean;
};

let pendingWatchUrl: string | null = null;
let pendingBackgroundPlay = false;
let queuePollerTimer: ReturnType<typeof setInterval> | null = null;
let pendingRetirePlayerIds: number[] = [];
let retireCoordinator: PlayerCoordinator | null = null;

function postWatchUrl(
  playerId: number,
  url: string,
  background = false,
  generation = getPlayGeneration(),
): void {
  global.postMessage(playerId, "openYouTubeWatch", {
    url,
    background,
    playGeneration: generation,
  });
  appendLog(
    `Posted openYouTubeWatch: ${url}${background ? " (background)" : ""}`,
  );
}

function requestCloseManagedPlayer(
  playerId: number,
  coordinator?: PlayerCoordinator,
  options?: { allowWindowQuit?: boolean },
): void {
  const managedRemaining = [...managedPlayerIds].filter((id) => id !== playerId).length;
  const liveCount = coordinator?.getLivePlayerCount?.() ?? managedPlayerIds.size;
  const allowWindowQuit =
    options?.allowWindowQuit ??
    (managedRemaining > 0 || liveCount > 1);

  try {
    global.postMessage(playerId, "closeManagedPlayer", {
      allowWindowQuit,
      playGeneration: getPlayGeneration(),
    });
    appendLog(
      `Posted closeManagedPlayer: ${playerId}${allowWindowQuit ? " (quit)" : " (unload)"}`,
    );
  } catch {
    // Player may already be gone.
  }
}

function queueRetireManagedPlayers(
  playerIds: readonly number[],
  coordinator: PlayerCoordinator,
  keepPlayerId: number | null = null,
  options?: { deferFlush?: boolean },
): void {
  for (const playerId of playerIds) {
    if (keepPlayerId !== null && playerId === keepPlayerId) {
      continue;
    }
    if (!managedPlayerIds.has(playerId)) {
      continue;
    }
    pendingRetirePlayerIds.push(playerId);
  }
  retireCoordinator = coordinator;
  if (!options?.deferFlush) {
    flushPendingRetirePlayers();
  }
}

/** Retire queued player windows after a replacement player is ready. */
export function flushPendingRetirePlayers(coordinator?: PlayerCoordinator): void {
  const targetCoordinator = coordinator ?? retireCoordinator;
  if (!targetCoordinator || pendingRetirePlayerIds.length === 0) {
    return;
  }

  const retiring = [...new Set(pendingRetirePlayerIds)];
  pendingRetirePlayerIds = [];

  for (const playerId of retiring) {
    if (!managedPlayerIds.has(playerId)) {
      continue;
    }
    requestCloseManagedPlayer(playerId, targetCoordinator, { allowWindowQuit: true });
    managedPlayerIds.delete(playerId);
    managedPlayerBackground.delete(playerId);
  }
}

export function registerManagedPlayer(playerId: number): void {
  const normalized = normalizePlayerId(playerId);
  if (normalized !== null) {
    managedPlayerIds.add(normalized);
  }
}

export function unregisterManagedPlayer(playerId: number): void {
  const normalized = normalizePlayerId(playerId);
  if (normalized !== null) {
    managedPlayerIds.delete(normalized);
    managedPlayerBackground.delete(normalized);
  }
}

function closeOrphanManagedPlayers(
  keepPlayerId: number | null,
  coordinator: PlayerCoordinator,
): void {
  queueRetireManagedPlayers([...managedPlayerIds], coordinator, keepPlayerId);
}

/** Stop playback and close a managed player window immediately. */
function retireManagedPlayerNow(
  playerId: number,
  coordinator: PlayerCoordinator,
): void {
  if (!managedPlayerIds.has(playerId)) {
    return;
  }
  requestCloseManagedPlayer(playerId, coordinator, { allowWindowQuit: true });
  managedPlayerIds.delete(playerId);
  managedPlayerBackground.delete(playerId);
  if (normalizePlayerId(coordinator.getActivePlayerId()) === playerId) {
    coordinator.setActivePlayerId(null);
    coordinator.setPlayerConfirmedReady(false);
  }
}

/** Foreground play must not leave Listen windows playing in the background. */
function retireAllBackgroundPlayersNow(coordinator: PlayerCoordinator): void {
  for (const playerId of [...managedPlayerIds]) {
    if (managedPlayerBackground.get(playerId)) {
      retireManagedPlayerNow(playerId, coordinator);
    }
  }
}

/** Stop plugin-managed players (e.g. background listeners while playing in another window). */
export function closeManagedPlayersForNewPlayback(
  coordinator: PlayerCoordinator,
): void {
  const closing = [...managedPlayerIds];
  managedPlayerIds.clear();
  managedPlayerBackground.clear();
  coordinator.setActivePlayerId(null);
  coordinator.setPlayerConfirmedReady(false);
  clearPendingWatchUrl();
  queueRetireManagedPlayers(closing, coordinator);
}

function createManagedPlayer(
  coordinator: PlayerCoordinator,
  background: boolean,
): number | null {
  const playerId = normalizePlayerId(
    global.createPlayerInstance({
      enablePlugins: false,
      disableWindowAnimation: background,
      disableUI: background,
      label: "youtube-open",
    }),
  );
  if (playerId === null) {
    return null;
  }

  coordinator.setActivePlayerId(playerId);
  coordinator.setPlayerConfirmedReady(true);
  registerManagedPlayer(playerId);
  managedPlayerBackground.set(playerId, background);
  return playerId;
}

/** Open a YouTube watch URL in a plugin-enabled player window. */
export function openYouTubeWatchUrl(
  url: string,
  coordinator: PlayerCoordinator,
  options?: OpenYouTubeWatchOptions,
): void {
  const background = !!options?.background;
  const normalized = normalizeMediaURL(url);
  if (!isYouTubeWatchURL(normalized)) {
    appendLog(`Open URL rejected (not YouTube watch): ${url}`);
    return;
  }

  appendLog(
    `Open YouTube URL: ${normalized}${background ? " (background)" : ""}`,
  );

  startOpenUrlQueuePoller(coordinator);

  try {
    global.postMessage(null, "suppressIdleBootstrap", {});
  } catch {
    // Best-effort — player may not be loaded yet.
  }

  const activeId = normalizePlayerId(coordinator.getActivePlayerId());
  const reusingActiveBackgroundPlayer =
    !background &&
    activeId !== null &&
    coordinator.isPlayerConfirmedReady() &&
    managedPlayerIds.has(activeId) &&
    !!managedPlayerBackground.get(activeId);

  if (!background) {
    if (reusingActiveBackgroundPlayer) {
      managedPlayerBackground.set(activeId!, false);
      appendLog(`Foreground play: reusing background listener ${activeId}`);
    } else {
      retireAllBackgroundPlayersNow(coordinator);
    }
  }

  const generation = bumpPlayGeneration();
  if (
    activeId !== null &&
    coordinator.isPlayerConfirmedReady() &&
    managedPlayerIds.has(activeId)
  ) {
    closeOrphanManagedPlayers(activeId, coordinator);
    managedPlayerBackground.set(activeId, background);
    appendLog(`Reusing managed player: ${activeId}`);
    postWatchUrl(activeId, normalized, background, generation);
    return;
  }

  if (activeId !== null && coordinator.isPlayerConfirmedReady()) {
    coordinator.setActivePlayerId(null);
    coordinator.setPlayerConfirmedReady(false);
  }

  const stalePlayers = [...managedPlayerIds];

  pendingWatchUrl = normalized;
  pendingBackgroundPlay = background;
  coordinator.setPlayerConfirmedReady(false);

  const playerId = createManagedPlayer(coordinator, background);
  if (playerId === null) {
    appendLog(`Create player failed for URL: ${normalized}`);
    return;
  }

  appendLog(`Created player for URL: ${playerId} (pending ${normalized})`);
  drainPendingWatchUrl(playerId, coordinator);
  queueRetireManagedPlayers(stalePlayers, coordinator, playerId, { deferFlush: true });
}

/** Drain a watch URL queued while the player instance was starting. */
export function drainPendingWatchUrl(
  playerId: number,
  coordinator: PlayerCoordinator,
): void {
  const activeId = normalizePlayerId(coordinator.getActivePlayerId());
  const normalizedTarget = normalizePlayerId(playerId);
  if (!pendingWatchUrl || activeId === null || activeId !== normalizedTarget) {
    return;
  }
  if (!coordinator.isPlayerConfirmedReady()) {
    appendLog(
      `Pending watch not drained (player not confirmed ready, target=${normalizedTarget})`,
    );
    return;
  }
  const url = pendingWatchUrl;
  const background = pendingBackgroundPlay;
  pendingWatchUrl = null;
  pendingBackgroundPlay = false;
  postWatchUrl(normalizedTarget, url, background);
  appendLog(
    `Drained pending openYouTubeWatch: ${url}${background ? " (background)" : ""}`,
  );
}

export type PendingWatchRequest = {
  url: string | null;
  background: boolean;
};

/** After browse or watch, prefer watch URL if both were requested. */
export function takePendingWatchRequest(): PendingWatchRequest {
  const request = {
    url: pendingWatchUrl,
    background: pendingBackgroundPlay,
  };
  pendingWatchUrl = null;
  pendingBackgroundPlay = false;
  return request;
}

/** @deprecated Use takePendingWatchRequest */
export function takePendingWatchUrl(): string | null {
  return takePendingWatchRequest().url;
}

export function hasPendingWatchUrl(): boolean {
  return pendingWatchUrl !== null;
}

export function clearPendingWatchUrl(): void {
  pendingWatchUrl = null;
  pendingBackgroundPlay = false;
}

/** Poll a CLI-written queue file (scripts/open-url.sh). */
export function startOpenUrlQueuePoller(coordinator: PlayerCoordinator): void {
  if (queuePollerTimer) {
    return;
  }
  queuePollerTimer = setInterval(() => {
    try {
      const path = utils.resolvePath(OPEN_URL_QUEUE);
      if (!file.exists(path)) {
        return;
      }
      const raw = (file.read(path) || "").trim();
      try {
        file.delete(path);
      } catch {
        file.write(path, "");
      }
      if (!raw) {
        return;
      }
      let url = raw;
      let background = false;
      if (raw.startsWith("{")) {
        try {
          const parsed = JSON.parse(raw) as {
            url?: string;
            background?: boolean;
          };
          if (typeof parsed.url === "string" && parsed.url.trim()) {
            url = parsed.url.trim();
            background = !!parsed.background;
          }
        } catch {
          appendLog(`open-url queue JSON parse failed: ${raw.slice(0, 120)}`);
        }
      }
      openYouTubeWatchUrl(url, coordinator, { background });
    } catch (err) {
      appendLog(`open-url queue error: ${err}`);
    }
  }, 400);
}

export function stopOpenUrlQueuePoller(): void {
  if (!queuePollerTimer) {
    return;
  }
  clearInterval(queuePollerTimer);
  queuePollerTimer = null;
  appendLog("Open-url queue poller stopped");
}