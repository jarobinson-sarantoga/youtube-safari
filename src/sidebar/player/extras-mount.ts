import { $ } from "../dom";
import {
  createBookmarksSection,
  createTranscriptSection,
} from "./extras-sections-b";
import { createSleepSection, createSpeedSection } from "./extras-sections";

export function mountPlayerExtras(): void {
  const mount = $("player-extras-mount");
  mount.innerHTML = "";
  mount.appendChild(createSpeedSection());
  mount.appendChild(createSleepSection());
  mount.appendChild(createTranscriptSection());
  mount.appendChild(createBookmarksSection());
}
