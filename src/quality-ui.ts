import { logMpvChapterCount, queueMpvChapters, refreshNativeChapterPanel } from "./chapters-mpv";
import { pickChapters, type DescriptionChapter } from "./description-chapters";
import { ensureExternalAudioSelected } from "./audio-track";
import { ensureSubtitlesSelected } from "./subtitles";
import { heightLabel } from "./format";
import { getLastWatchUrl } from "./preferences";
import { getSelectedHeight, listQualities, type QualityItem } from "./qualities";
import {
  DEFAULT_QUALITY_OPTIONS,
  defaultPanelPayload,
  type PanelPayload,
} from "./sidebar-state";
import { notifyPlayerStateFromFileLoaded, registerBrowseHandlers } from "./browse/init";
import { suppressNextWatchEnd } from "./browse/store/history";
import { registerBrowseShortcut } from "./shortcuts";
import {
  applyPendingSeek,
  openLinkedUrl,
  seekPlayback,
  setPendingSeek,
} from "./youtube-open";
import { appendLog } from "./ytdl";
import type { FeedItem } from "./browse/types";
import { getRelatedItems } from "./browse/feeds/related";
import { getYouTubeVideoId, isYouTubeWatchURL, normalizeMediaURL } from "./youtube";

const { core, event, global, menu, mpv, preferences, sidebar } = iina;

const QUALITY_MENU_TITLE = "Quality";
const CHAPTERS_MENU_TITLE = "Chapters";

let lastListedTitle = "";
let lastListedDescription = "";
let lastListedChapters: DescriptionChapter[] = [];
let sidebarHtmlLoaded = false;
let menuUpdatesEnabled = false;
let lastPanelPayload: PanelPayload | null = null;
let refreshTimer: ReturnType<typeof setTimeout> | null = null;
let refreshInFlight = false;
let pendingRefresh = false;

type SidebarRevealView = "browse" | "player";

let pendingSidebarReveal: SidebarRevealView | null = null;
let sidebarWebViewReady = false;

function postSidebarPanel(payload: PanelPayload): void {
  lastPanelPayload = payload;
  if (!sidebarHtmlLoaded) {
    return;
  }
  sidebar.postMessage("panel", payload);
}

function schedulePanelPush(): void {
  if (!sidebarHtmlLoaded || !lastPanelPayload) {
    return;
  }
  sidebar.postMessage("panel", lastPanelPayload);
  setTimeout(() => {
    if (sidebarHtmlLoaded && lastPanelPayload) {
      sidebar.postMessage("panel", lastPanelPayload);
    }
  }, 300);
}

/** IINA typings use addSubMenuItem; runtime may expose addSubmenuItem instead. */
function addSubmenuItemCompat(parent: IINA.MenuItem, item: IINA.MenuItem): void {
  const parentAny = parent as IINA.MenuItem & { addSubmenuItem?: (child: IINA.MenuItem) => void };
  if (typeof parent.addSubMenuItem === "function") {
    parent.addSubMenuItem(item);
    return;
  }
  if (typeof parentAny.addSubmenuItem === "function") {
    parentAny.addSubmenuItem(item);
    return;
  }
  throw new Error("MenuItem has no addSubMenuItem/addSubmenuItem");
}

function findMenuIndex(title: string): number {
  const items = menu.items();
  for (let i = 0; i < items.length; i++) {
    if (items[i].title === title) {
      return i;
    }
  }
  return -1;
}

function findQualityMenuIndex(): number {
  return findMenuIndex(QUALITY_MENU_TITLE);
}

function findChapterMenuIndex(): number {
  return findMenuIndex(CHAPTERS_MENU_TITLE);
}

function updateListedChapters(description: string, ytdlpChapters?: DescriptionChapter[]): void {
  lastListedChapters = pickChapters(ytdlpChapters, description);
  appendLog(`Chapters updated: ${lastListedChapters.length} (desc=${description.length} chars)`);
  queueMpvChapters(lastListedChapters);
}

function replaceChapterMenu(chapters: DescriptionChapter[]): void {
  const idx = findChapterMenuIndex();
  if (idx >= 0) {
    menu.removeAt(idx);
  }

  const root = menu.item(CHAPTERS_MENU_TITLE);
  if (chapters.length === 0) {
    addSubmenuItemCompat(root, menu.item("No chapters", undefined, { enabled: false }));
  } else {
    for (const chapter of chapters) {
      const label = `${chapter.timestamp} ${chapter.label}`;
      addSubmenuItemCompat(
        root,
        menu.item(label, () => {
          seekPlayback(chapter.seconds, "chapter-menu");
        }),
      );
    }
  }

  menu.addItem(root);
  if (menuUpdatesEnabled) {
    menu.forceUpdate();
  }
}

function replaceQualityMenu(qualities: QualityItem[], selected: number): void {
  const idx = findQualityMenuIndex();
  if (idx >= 0) {
    menu.removeAt(idx);
  }

  const root = menu.item(QUALITY_MENU_TITLE);
  for (const quality of qualities) {
    addSubmenuItemCompat(
      root,
      menu.item(
        quality.label,
        () => {
          void switchQuality(quality.height);
        },
        { selected: quality.height === selected },
      ),
    );
  }

  if (qualities.length === 0) {
    addSubmenuItemCompat(root, menu.item("No YouTube video", undefined, { enabled: false }));
  }

  menu.addItem(root);
  if (menuUpdatesEnabled) {
    menu.forceUpdate();
  }
}

function buildPanelPayload(
  items: QualityItem[],
  selected: number,
  loading: boolean,
  error?: string,
): PanelPayload {
  const watchUrl = getLastWatchUrl();
  return {
    items,
    selected,
    title: lastListedTitle,
    description: lastListedDescription,
    chapters: lastListedChapters,
    loading,
    watchUrl: isYouTubeWatchURL(watchUrl) ? watchUrl : "",
    error: error || undefined,
  };
}

export async function refreshQualityUI(): Promise<void> {
  if (refreshInFlight) {
    pendingRefresh = true;
    return;
  }

  const watchUrl = getLastWatchUrl();
  const selected = getSelectedHeight();

  if (!watchUrl || !isYouTubeWatchURL(watchUrl)) {
    lastListedTitle = "";
    lastListedDescription = "";
    lastListedChapters = [];
    replaceQualityMenu(DEFAULT_QUALITY_OPTIONS, selected);
    replaceChapterMenu([]);
    postSidebarPanel(defaultPanelPayload(selected));
    return;
  }

  refreshInFlight = true;
  postSidebarPanel(
    buildPanelPayload(
      lastPanelPayload?.items || DEFAULT_QUALITY_OPTIONS,
      selected,
      true,
    ),
  );

  try {
    const listed = await listQualities(watchUrl);
    if (listed.title) {
      lastListedTitle = listed.title;
    }
    if (listed.description) {
      lastListedDescription = listed.description;
    }
    if (listed.description || listed.chapters.length) {
      updateListedChapters(listed.description, listed.chapters);
    }
    replaceQualityMenu(listed.items, selected);
    replaceChapterMenu(lastListedChapters);
    refreshNativeChapterPanel(lastListedChapters);
    postSidebarPanel(buildPanelPayload(listed.items, selected, false, listed.error));
    schedulePanelPush();
  } catch (err) {
    appendLog(`refreshQualityUI error: ${err}`);
    const message = err instanceof Error ? err.message : String(err);
    postSidebarPanel(buildPanelPayload(DEFAULT_QUALITY_OPTIONS, selected, false, message));
  } finally {
    refreshInFlight = false;
    if (pendingRefresh) {
      pendingRefresh = false;
      void refreshQualityUI();
    }
  }
}

export function scheduleRefreshQualityUI(): void {
  if (refreshTimer) {
    clearTimeout(refreshTimer);
  }
  refreshTimer = setTimeout(() => {
    refreshTimer = null;
    void refreshQualityUI();
  }, 400);
}

export async function switchQuality(height: number): Promise<void> {
  const watchUrl = getLastWatchUrl();

  preferences.set("quality_height", height);
  preferences.sync();
  appendLog(`Quality switched to ${heightLabel(height)} (${height})`);

  if (!watchUrl || !isYouTubeWatchURL(watchUrl)) {
    core.osd(`Default quality: ${heightLabel(height)}`);
    replaceQualityMenu(DEFAULT_QUALITY_OPTIONS, height);
    postSidebarPanel(defaultPanelPayload(height));
    return;
  }

  const position = mpv.getNumber("time-pos") || 0;
  const duration = mpv.getNumber("duration") || 0;
  const resumeAt =
    duration > 0 ? Math.min(position, Math.max(0, duration - 0.5)) : position;
  if (resumeAt > 0) {
    setPendingSeek(resumeAt);
    appendLog(`Quality reload will resume at ${resumeAt}s`);
  }

  core.osd(`Quality: ${heightLabel(height)}`);
  suppressNextWatchEnd();
  mpv.command("loadfile", [watchUrl, "replace"]);
  scheduleRefreshQualityUI();
}

export function saveWatchUrl(
  rawUrl: string,
  title?: string,
  description?: string,
  ytdlpChapters?: DescriptionChapter[],
): void {
  const url = normalizeMediaURL(rawUrl);
  if (!isYouTubeWatchURL(url)) {
    return;
  }
  const previousWatchUrl = getLastWatchUrl();
  preferences.set("last_watch_url", url);
  preferences.sync();
  if (title) {
    lastListedTitle = title;
  }
  if (description) {
    lastListedDescription = description;
  }
  if (description || (ytdlpChapters && ytdlpChapters.length > 0)) {
    updateListedChapters(description || "", ytdlpChapters);
    replaceChapterMenu(lastListedChapters);
  }

  const selected = getSelectedHeight();
  postSidebarPanel(
    buildPanelPayload(
      lastPanelPayload?.items || DEFAULT_QUALITY_OPTIONS,
      selected,
      true,
    ),
  );
  schedulePanelPush();

  if (sidebarHtmlLoaded && url !== previousWatchUrl) {
    sidebar.postMessage("watchUrlChanged", { watchUrl: url });
    void postRelatedPreview(url);
  }
}

function postRelatedPreviewItems(
  videoId: string,
  items: FeedItem[],
  error?: string,
): void {
  if (!sidebarHtmlLoaded) {
    return;
  }
  sidebar.postMessage("relatedPreview", { videoId, items, error });
}

function postRelatedPreview(watchUrl: string, force = false): void {
  if (!isYouTubeWatchURL(watchUrl)) {
    postRelatedPreviewItems("", []);
    return;
  }

  const requestVideoId = getYouTubeVideoId(watchUrl) || "";
  if (!requestVideoId) {
    postRelatedPreviewItems("", []);
    return;
  }

  void (async () => {
    try {
      const result = await getRelatedItems(requestVideoId, force);
      postRelatedPreviewItems(requestVideoId, result.items, result.error);
    } catch (err) {
      appendLog(`related preview failed: ${err}`);
      const message = err instanceof Error ? err.message : String(err);
      postRelatedPreviewItems(requestVideoId, [], message);
    }
  })();
}

/** IINA clears sidebar.onMessage listeners when loadFile runs — register after every load. */
function registerSidebarMessageHandlers(): void {
  sidebar.onMessage("sidebarReady", () => {
    sidebarWebViewReady = true;
    appendLog("Sidebar ready");
    // loadFile clears sidebar.onMessage listeners — re-register before any browse fetch.
    registerBrowseHandlers();
    sidebar.postMessage("browseReady", {});

    if (lastPanelPayload) {
      sidebar.postMessage("panel", lastPanelPayload);
    } else {
      postSidebarPanel(defaultPanelPayload(getSelectedHeight()));
    }
    schedulePanelPush();

    const watchUrl = getLastWatchUrl();
    if (isYouTubeWatchURL(watchUrl)) {
      void postRelatedPreview(watchUrl);
    }

    applyPendingSidebarReveal();
  });

  sidebar.onMessage("selectQuality", (data: { height?: number }) => {
    appendLog(`selectQuality received: ${JSON.stringify(data)}`);
    const height = data?.height;
    if (typeof height === "number") {
      void switchQuality(height);
    }
  });

  function handleDescriptionSeek(data: { seconds?: number | string } | undefined): void {
    appendLog(`descriptionSeek received: ${JSON.stringify(data)}`);
    let seconds = data?.seconds;
    if (typeof seconds === "string") {
      seconds = Number.parseFloat(seconds);
    }
    if (typeof seconds !== "number" || seconds < 0 || !Number.isFinite(seconds)) {
      appendLog("descriptionSeek ignored: invalid seconds");
      return;
    }
    seekPlayback(seconds, "description");
  }

  sidebar.onMessage("descriptionSeek", handleDescriptionSeek);
  sidebar.onMessage("seek", handleDescriptionSeek);

  sidebar.onMessage("openUrl", (data: { url?: string }) => {
    const url = data?.url;
    if (typeof url !== "string") {
      return;
    }
    openLinkedUrl(url);
  });

  sidebar.onMessage("requestRelatedPreview", (data: { force?: boolean } | undefined) => {
    const watchUrl = getLastWatchUrl();
    postRelatedPreview(watchUrl, !!data?.force);
  });

  sidebar.onMessage("refreshPanel", () => {
    void refreshQualityUI();
  });
}

function applyPendingSidebarReveal(): void {
  if (pendingSidebarReveal === null || !sidebarHtmlLoaded || !sidebarWebViewReady) {
    return;
  }

  const view = pendingSidebarReveal;
  pendingSidebarReveal = null;

  sidebar.show();
  if (view === "browse") {
    sidebar.postMessage("focusBrowse", {});
  } else {
    sidebar.postMessage("focusPlayer", {});
  }
  schedulePanelPush();
  appendLog(`YouTube panel shown (${view})`);
}

function loadSidebarHtml(): void {
  if (sidebarHtmlLoaded) {
    schedulePanelPush();
    applyPendingSidebarReveal();
    return;
  }
  sidebar.loadFile("sidebar/shell.html");
  registerSidebarMessageHandlers();
  sidebarHtmlLoaded = true;
  appendLog("Sidebar HTML loaded");
  schedulePanelPush();
}

/** Load sidebar shell if needed, then show the panel (defers until window-loaded). */
export function revealYouTubePanel(view: SidebarRevealView = "player"): void {
  pendingSidebarReveal = view;
  try {
    loadSidebarHtml();
  } catch (err) {
    appendLog(`revealYouTubePanel deferred until window-loaded: ${err}`);
  }
}

export function initQualityUI(): void {
  try {
    loadSidebarHtml();
  } catch (err) {
    appendLog(`Sidebar eager load failed: ${err}`);
  }

  function enableMenuUpdates(): void {
    if (menuUpdatesEnabled) {
      return;
    }
    menuUpdatesEnabled = true;
    appendLog("Menu updates enabled");
    scheduleRefreshQualityUI();
  }

  global.onMessage("openYouTubeBrowse", () => {
    revealYouTubePanel("player");
    appendLog("Open YouTube panel triggered");
  });

  event.on("iina.window-loaded", () => {
    enableMenuUpdates();
    try {
      loadSidebarHtml();
    } catch (err) {
      appendLog(`Sidebar load on window-loaded failed: ${err}`);
    }
    if (pendingSidebarReveal !== null) {
      appendLog("Applying deferred YouTube panel reveal after window-loaded");
    }
  });

  setTimeout(enableMenuUpdates, 0);

  registerBrowseShortcut();

  postSidebarPanel(defaultPanelPayload(getSelectedHeight()));
}

export function registerFileLoadedRefresh(eventApi: IINA.API.Event): void {
  const onFileLoaded = (): void => {
    ensureExternalAudioSelected();
    ensureSubtitlesSelected();
    applyPendingSeek();
    if (lastListedChapters.length > 0) {
      refreshNativeChapterPanel(lastListedChapters);
      setTimeout(() => logMpvChapterCount("file-loaded"), 300);
    }

    if (!sidebarHtmlLoaded) {
      try {
        loadSidebarHtml();
      } catch (err) {
        appendLog(`Sidebar load on file-loaded failed: ${err}`);
      }
    }

    const current = mpv.getString("stream-open-filename") || "";
    const normalized = normalizeMediaURL(current);
    const watchUrl = getLastWatchUrl();
    const isIdleFilename =
      !current ||
      current === "-" ||
      current === "/dev/null" ||
      current.endsWith("null://");
    if (
      !isIdleFilename &&
      !isYouTubeWatchURL(normalized) &&
      !/googlevideo\.com/i.test(normalized) &&
      !isYouTubeWatchURL(watchUrl)
    ) {
      if (watchUrl) {
        preferences.set("last_watch_url", "");
        preferences.sync();
        if (sidebarHtmlLoaded) {
          sidebar.postMessage("watchUrlChanged", { watchUrl: "" });
          sidebar.postMessage("relatedPreview", { videoId: "", items: [] });
        }
      }
      lastListedTitle = "";
      lastListedDescription = "";
      lastListedChapters = [];
      replaceChapterMenu([]);
    }
    scheduleRefreshQualityUI();
    notifyPlayerStateFromFileLoaded();
  };

  eventApi.on("iina.file-loaded", onFileLoaded);
}