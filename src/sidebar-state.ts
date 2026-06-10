import type { DescriptionChapter } from "./description-chapters";
import { heightLabel } from "./format";
import type { QualityItem } from "./qualities";

export interface PanelPayload {
  items: QualityItem[];
  selected: number;
  title: string;
  description: string;
  chapters: DescriptionChapter[];
  loading: boolean;
  watchUrl?: string;
}

/** Default quality choices shown in the sidebar even when no video is open. */
export const DEFAULT_QUALITY_OPTIONS: QualityItem[] = [
  { height: 0, label: heightLabel(0) },
  { height: 2160, label: heightLabel(2160) },
  { height: 1440, label: heightLabel(1440) },
  { height: 1080, label: heightLabel(1080) },
  { height: 720, label: heightLabel(720) },
  { height: 480, label: heightLabel(480) },
  { height: 360, label: heightLabel(360) },
];

export function defaultPanelPayload(selected: number): PanelPayload {
  return {
    items: DEFAULT_QUALITY_OPTIONS,
    selected,
    title: "",
    description: "",
    chapters: [],
    loading: false,
  };
}