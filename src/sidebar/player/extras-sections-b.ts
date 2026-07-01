import { postToPlugin } from "../messaging";

export function createTranscriptSection(): HTMLElement {
  const section = document.createElement("div");
  section.className = "section";
  section.id = "transcript-section";

  const head = document.createElement("div");
  head.className = "section-head";

  const title = document.createElement("p");
  title.className = "section-title";
  title.textContent = "Transcript";

  const refresh = document.createElement("button");
  refresh.type = "button";
  refresh.className = "feed-action-btn";
  refresh.textContent = "Load";
  refresh.addEventListener("click", () => {
    postToPlugin("requestTranscript", {});
  });

  head.appendChild(title);
  head.appendChild(refresh);

  const list = document.createElement("div");
  list.id = "transcript-list";
  list.className = "transcript-list empty";
  list.textContent = "Load transcript for the current video.";

  section.appendChild(head);
  section.appendChild(list);
  return section;
}

export function createBookmarksSection(): HTMLElement {
  const section = document.createElement("div");
  section.className = "section";
  section.id = "bookmarks-section";

  const head = document.createElement("div");
  head.className = "section-head";

  const title = document.createElement("p");
  title.className = "section-title";
  title.textContent = "Bookmarks";

  const addBtn = document.createElement("button");
  addBtn.type = "button";
  addBtn.className = "feed-action-btn";
  addBtn.id = "bookmark-add";
  addBtn.textContent = "Add at playhead";

  head.appendChild(title);
  head.appendChild(addBtn);

  const list = document.createElement("div");
  list.id = "bookmark-list";
  list.className = "bookmark-list empty";
  list.textContent = "No bookmarks yet.";

  section.appendChild(head);
  section.appendChild(list);
  return section;
}
