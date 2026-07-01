import { $, formatDuration } from "../dom";
import { postToPlugin } from "../messaging";
import { getYouTubeVideoId } from "../../youtube";
import { playerState } from "./state";

export function setupTranscriptPanel(): void {
  // transcript list rendered on message
}

export function renderTranscript(
  videoId: string,
  cues: { start: number; end: number; text: string }[],
  error?: string,
  loading?: boolean,
): void {
  const list = $("transcript-list");
  list.innerHTML = "";
  list.classList.remove("empty");

  const currentId = getYouTubeVideoId(playerState.currentWatchUrl) || "";
  if (videoId && currentId && videoId !== currentId) {
    return;
  }

  if (loading) {
    list.classList.add("empty");
    list.textContent = "Loading transcript…";
    return;
  }
  if (error) {
    list.classList.add("empty");
    list.textContent = error;
    return;
  }
  if (!cues.length) {
    list.classList.add("empty");
    list.textContent = "No transcript available.";
    return;
  }

  for (const cue of cues) {
    const row = document.createElement("button");
    row.type = "button";
    row.className = "transcript-cue";
    const time = document.createElement("time");
    time.textContent = formatDuration(cue.start);
    row.appendChild(time);
    row.appendChild(document.createTextNode(cue.text));
    row.addEventListener("click", () => {
      postToPlugin("seek", { seconds: cue.start });
    });
    list.appendChild(row);
  }
}

export function setupBookmarksPanel(): void {
  const addBtn = $("bookmark-add");
  addBtn.addEventListener("click", () => {
    const videoId = getYouTubeVideoId(playerState.currentWatchUrl) || "";
    if (!videoId) {
      return;
    }
    const seconds = playerState.lastPosition || 0;
    postToPlugin("libraryAction", {
      action: "addBookmark",
      videoId,
      seconds,
      label: `At ${formatDuration(seconds)}`,
    });
  });
}

export function renderBookmarks(
  videoId: string,
  items: { id: string; seconds: number; label: string }[],
): void {
  const list = $("bookmark-list");
  list.innerHTML = "";
  const currentId = getYouTubeVideoId(playerState.currentWatchUrl) || "";
  if (videoId && currentId && videoId !== currentId) {
    return;
  }
  if (!items.length) {
    list.classList.add("empty");
    list.textContent = "No bookmarks yet.";
    return;
  }
  list.classList.remove("empty");
  for (const item of items) {
    const row = document.createElement("div");
    row.className = "bookmark-row";

    const seekBtn = document.createElement("button");
    seekBtn.type = "button";
    seekBtn.className = "feed-action-btn";
    seekBtn.textContent = `${formatDuration(item.seconds)} — ${item.label}`;
    seekBtn.addEventListener("click", () => {
      postToPlugin("seek", { seconds: item.seconds });
    });

    const delBtn = document.createElement("button");
    delBtn.type = "button";
    delBtn.className = "feed-action-btn";
    delBtn.textContent = "×";
    delBtn.setAttribute("aria-label", "Remove bookmark");
    delBtn.addEventListener("click", () => {
      postToPlugin("libraryAction", {
        action: "removeBookmark",
        id: item.id,
        videoId,
      });
      row.remove();
    });

    row.appendChild(seekBtn);
    row.appendChild(delBtn);
    list.appendChild(row);
  }
}

export function updateSleepStatus(endsAt: number): void {
  const status = $("sleep-status");
  if (!endsAt) {
    status.textContent = "";
    status.classList.remove("visible");
    return;
  }
  const remaining = Math.max(0, endsAt - Date.now());
  const minutes = Math.ceil(remaining / 60_000);
  status.textContent = `Pauses in ${minutes} min`;
  status.classList.add("visible");
}

export function updateSpeedSelect(speed: number): void {
  const select = $("speed-select") as HTMLSelectElement | null;
  if (!select) {
    return;
  }
  select.value = String(speed);
}
