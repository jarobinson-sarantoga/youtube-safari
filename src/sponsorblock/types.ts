export type SponsorCategory =
  | "sponsor"
  | "intro"
  | "outro"
  | "selfpromo"
  | "interaction"
  | "preview"
  | "filler"
  | "music_offtopic";

export interface SponsorSegment {
  start: number;
  end: number;
  category: SponsorCategory;
  votes: number;
}

export const DEFAULT_SPONSOR_CATEGORIES: SponsorCategory[] = [
  "sponsor",
  "intro",
  "outro",
  "selfpromo",
  "interaction",
  "preview",
];
