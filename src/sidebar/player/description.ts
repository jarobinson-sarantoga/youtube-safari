import { IDLE_COPY } from "../copy";
import { $, escapeHtml } from "../dom";
import { postToPlugin } from "../messaging";
import { playerState } from "./state";

function escapeAttr(text: string): string {
  return escapeHtml(text).replace(/'/g, "&#39;");
}

function trimUrlTrailingPunctuation(url: string): string {
  return url.replace(/[),.;:!?]+$/g, "");
}

function formatInlineRich(text: string): string {
  let out = "";
  const re = /(https?:\/\/[^\s<]+)|(^|[^\w/])(#[\w\u00C0-\u024F\u0400-\u04FF]+)/g;
  let last = 0;
  let match: RegExpExecArray | null;

  while ((match = re.exec(text)) !== null) {
    out += escapeHtml(text.slice(last, match.index));
    if (match[1]) {
      const rawUrl = trimUrlTrailingPunctuation(match[1]);
      const trimmed = match[1].length - rawUrl.length;
      if (trimmed > 0) {
        re.lastIndex -= trimmed;
      }
      out += `<a class="desc-link" href="#" data-url="${escapeAttr(rawUrl)}">${escapeHtml(rawUrl)}</a>`;
    } else if (match[3]) {
      const tagUrl = `https://www.youtube.com/results?search_query=${encodeURIComponent(match[3])}`;
      out += `${escapeHtml(match[2])}<a class="desc-tag desc-link" href="#" data-url="${escapeAttr(tagUrl)}">${escapeHtml(match[3])}</a>`;
    }
    last = re.lastIndex;
  }

  out += escapeHtml(text.slice(last));
  return out;
}

function bindDescriptionLinks(root: HTMLElement): void {
  const links = root.querySelectorAll<HTMLElement>(".desc-link");
  links.forEach((link) => {
    link.addEventListener("click", (event) => {
      event.preventDefault();
      const url = link.getAttribute("data-url") || "";
      if (url) {
        postToPlugin("openUrl", { url });
      }
    });
  });
}

function renderDescription(description: string): void {
  const descriptionEl = $("description");
  descriptionEl.innerHTML = "";
  if (!description) {
    descriptionEl.textContent = "No description available.";
    descriptionEl.classList.add("empty");
    return;
  }

  descriptionEl.classList.remove("empty");
  for (const line of description.split(/\r?\n/)) {
    if (!line.trim()) {
      descriptionEl.appendChild(document.createElement("br"));
      continue;
    }
    const lineEl = document.createElement("div");
    lineEl.className = "desc-line";
    lineEl.innerHTML = formatInlineRich(line);
    descriptionEl.appendChild(lineEl);
  }
  bindDescriptionLinks(descriptionEl);
}

export function updateDescriptionSection(description: string, hasVideo: boolean): void {
  const sectionEl = $("description-section");
  if (!description && !hasVideo) {
    playerState.lastRenderedDescription = "";
    sectionEl.classList.remove("hidden");
    const descriptionEl = $("description");
    descriptionEl.textContent = IDLE_COPY.description;
    descriptionEl.classList.add("empty");
    return;
  }

  sectionEl.classList.remove("hidden");
  if (description) {
    if (description === playerState.lastRenderedDescription) {
      return;
    }
    playerState.lastRenderedDescription = description;
    renderDescription(description);
    return;
  }

  playerState.lastRenderedDescription = "";
  const descriptionEl = $("description");
  descriptionEl.textContent = "No description available.";
  descriptionEl.classList.add("empty");
}
