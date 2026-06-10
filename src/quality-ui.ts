import { logMpvChapterCount, queueMpvChapters, refreshNativeChapterPanel } from "./chapters-mpv";
import { pickChapters, type DescriptionChapter } from "./description-chapters";
import { ensureExternalAudioSelected } from "./audio-track";
import { ensureSubtitlesSelected } from "./subtitles";
import { heightLabel } from "./format";
import { getSelectedHeight, listQualities, type QualityItem } from "./qualities";
import {
  DEFAULT_QUALITY_OPTIONS,
  defaultPanelPayload,
  type PanelPayload,
} from "./sidebar-state";
import { applyPendingSeek, openLinkedUrl, seekPlayback } from "./youtube-open";
import { appendLog } from "./ytdl";
import { isYouTubeWatchURL, normalizeMediaURL } from "./youtube";

const { core, event, menu, mpv, preferences, sidebar } = iina;

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
  for (const delay of [0, 150, 600]) {
    setTimeout(() => {
      if (sidebarHtmlLoaded && lastPanelPayload) {
        sidebar.postMessage("panel", lastPanelPayload);
      }
    }, delay);
  }
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

  const root = menu.item(CHAPTERS_MENU_TITLE, null);
  if (chapters.length === 0) {
    addSubmenuItemCompat(root, menu.item("No chapters", null, { enabled: false }));
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

  const root = menu.item(QUALITY_MENU_TITLE, null);
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
    addSubmenuItemCompat(root, menu.item("No YouTube video", null, { enabled: false }));
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
): PanelPayload {
  return {
    items,
    selected,
    title: lastListedTitle,
    description: lastListedDescription,
    chapters: lastListedChapters,
    loading,
  };
}

export async function refreshQualityUI(): Promise<void> {
  if (refreshInFlight) {
    return;
  }

  const watchUrl = (preferences.get("last_watch_url") as string | undefined) || "";
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
    postSidebarPanel(buildPanelPayload(listed.items, selected, false));
    schedulePanelPush();
  } catch (err) {
    appendLog(`refreshQualityUI error: ${err}`);
    postSidebarPanel(buildPanelPayload(DEFAULT_QUALITY_OPTIONS, selected, false));
  } finally {
    refreshInFlight = false;
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
  const watchUrl = (preferences.get("last_watch_url") as string | undefined) || "";

  preferences.set("quality_height", height);
  preferences.sync();
  appendLog(`Quality switched to ${heightLabel(height)} (${height})`);

  if (!watchUrl || !isYouTubeWatchURL(watchUrl)) {
    core.osd(`Default quality: ${heightLabel(height)}`);
    replaceQualityMenu(DEFAULT_QUALITY_OPTIONS, height);
    postSidebarPanel(defaultPanelPayload(height));
    return;
  }

  core.osd(`Quality: ${heightLabel(height)}`);
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
}

/** IINA clears sidebar.onMessage listeners when loadFile runs — register after every load. */
function registerSidebarMessageHandlers(): void {
  sidebar.onMessage("sidebarReady", () => {
    appendLog("Sidebar ready");
    if (lastPanelPayload) {
      sidebar.postMessage("panel", lastPanelPayload);
    } else {
      postSidebarPanel(defaultPanelPayload(getSelectedHeight()));
    }
    schedulePanelPush();
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
}

function loadSidebarHtml(): void {
  if (sidebarHtmlLoaded) {
    schedulePanelPush();
    return;
  }
  sidebar.loadFile("sidebar.html");
  registerSidebarMessageHandlers();
  sidebarHtmlLoaded = true;
  appendLog("Sidebar HTML loaded");
  schedulePanelPush();
}

export function initQualityUI(): void {

  function enableMenuUpdates(): void {
    if (menuUpdatesEnabled) {
      return;
    }
    menuUpdatesEnabled = true;
    appendLog("Menu updates enabled");
    scheduleRefreshQualityUI();
  }

  event.on("iina.window-loaded", () => {
    enableMenuUpdates();
    try {
      loadSidebarHtml();
    } catch (err) {
      appendLog(`Sidebar load on window-loaded failed: ${err}`);
    }
  });

  setTimeout(enableMenuUpdates, 0);

  menu.addItem(
    menu.item("Show YouTube Panel", () => {
      if (!sidebarHtmlLoaded) {
        try {
          loadSidebarHtml();
        } catch (err) {
          appendLog(`Sidebar load on show failed: ${err}`);
          core.osd("YouTube panel not ready yet");
          return;
        }
      }
      sidebar.show();
      if (lastPanelPayload) {
        sidebar.postMessage("panel", lastPanelPayload);
      } else {
        postSidebarPanel(defaultPanelPayload(getSelectedHeight()));
      }
      schedulePanelPush();
    }),
  );

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
    const watchUrl = (preferences.get("last_watch_url") as string | undefined) || "";
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
      preferences.set("last_watch_url", "");
      preferences.sync();
      lastListedTitle = "";
      lastListedDescription = "";
      lastListedChapters = [];
      replaceChapterMenu([]);
    }
    scheduleRefreshQualityUI();
  };

  eventApi.on("iina.file-loaded", onFileLoaded);
}