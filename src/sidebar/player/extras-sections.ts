import { $ } from "../dom";
import { PLAYBACK_SPEED_OPTIONS } from "../../shared/playback-speed-options";
import { postToPlugin } from "../messaging";

export function createSpeedSection(): HTMLElement {
  const section = document.createElement("div");
  section.className = "section";
  section.id = "speed-section";

  const label = document.createElement("label");
  label.className = "section-title";
  label.htmlFor = "speed-select";
  label.textContent = "Speed";

  const row = document.createElement("div");
  row.className = "player-toolbar-row";

  const select = document.createElement("select");
  select.id = "speed-select";
  select.className = "panel-select";
  for (const speed of PLAYBACK_SPEED_OPTIONS) {
    const opt = document.createElement("option");
    opt.value = String(speed);
    opt.textContent = speed === 1 ? "Normal" : `${speed}x`;
    if (speed === 1) {
      opt.selected = true;
    }
    select.appendChild(opt);
  }
  select.addEventListener("change", () => {
    postToPlugin("setPlaybackSpeed", { speed: Number(select.value) });
  });

  row.appendChild(select);
  section.appendChild(label);
  section.appendChild(row);
  return section;
}

export function createSleepSection(): HTMLElement {
  const section = document.createElement("div");
  section.className = "section";
  section.id = "sleep-section";

  const label = document.createElement("label");
  label.className = "section-title";
  label.htmlFor = "sleep-select";
  label.textContent = "Sleep timer";

  const row = document.createElement("div");
  row.className = "player-toolbar-row";

  const select = document.createElement("select");
  select.id = "sleep-select";
  select.className = "panel-select";
  const options = [
    { value: "0", label: "Off" },
    { value: "15", label: "15 minutes" },
    { value: "30", label: "30 minutes" },
    { value: "45", label: "45 minutes" },
    { value: "60", label: "1 hour" },
    { value: "90", label: "1.5 hours" },
  ];
  for (const optData of options) {
    const opt = document.createElement("option");
    opt.value = optData.value;
    opt.textContent = optData.label;
    select.appendChild(opt);
  }
  select.addEventListener("change", () => {
    postToPlugin("setSleepTimer", { minutes: Number(select.value) });
  });

  const status = document.createElement("span");
  status.id = "sleep-status";
  status.className = "quality-status";
  status.setAttribute("role", "status");

  row.appendChild(select);
  section.appendChild(label);
  section.appendChild(row);
  section.appendChild(status);
  return section;
}
