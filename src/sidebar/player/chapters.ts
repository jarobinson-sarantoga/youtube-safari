import type { DescriptionChapter } from "../../description-chapters";
import { IDLE_COPY } from "../copy";
import { $ } from "../dom";
import { postToPlugin } from "../messaging";

export function renderChapters(chapters: DescriptionChapter[], hasVideo: boolean): void {
  const sectionEl = $("chapters-section");
  const selectEl = $("chapter-list") as HTMLSelectElement;
  selectEl.innerHTML = "";

  if (!chapters.length) {
    sectionEl.classList.add("hidden");
    const option = document.createElement("option");
    option.value = "";
    option.textContent = hasVideo ? "No chapters in this description." : IDLE_COPY.chapters;
    selectEl.appendChild(option);
    selectEl.disabled = true;
    return;
  }

  sectionEl.classList.remove("hidden");
  const placeholder = document.createElement("option");
  placeholder.value = "";
  placeholder.textContent = "Jump to chapter…";
  selectEl.appendChild(placeholder);

  for (const chapter of chapters) {
    const option = document.createElement("option");
    option.value = String(chapter.seconds);
    option.textContent = `${chapter.timestamp} ${chapter.label}`;
    selectEl.appendChild(option);
  }

  selectEl.disabled = false;
  selectEl.value = "";
}

export function setupChapterSelect(): void {
  const selectEl = $("chapter-list") as HTMLSelectElement;
  selectEl.addEventListener("change", () => {
    const seconds = Number.parseInt(selectEl.value, 10);
    if (!Number.isNaN(seconds) && seconds >= 0) {
      postToPlugin("descriptionSeek", { seconds });
    }
    selectEl.value = "";
  });
}
