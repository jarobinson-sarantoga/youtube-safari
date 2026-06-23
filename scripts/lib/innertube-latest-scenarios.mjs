import { LATEST_PARAMS, YT_ORIGIN } from "./innertube-constants.mjs";

export const LATEST_VS_SUBS_SCENARIOS = [
  { id: "subs_all", label: "Subs — FEsubscriptions (no params)", browseId: "FEsubscriptions" },
  {
    id: "latest",
    label: "Latest — FEsubscriptions + EgIIAhgBIhMCCAE%3D",
    browseId: "FEsubscriptions",
    params: LATEST_PARAMS,
  },
  {
    id: "subs_alt1",
    label: "Alt — FEsubscriptions + EgIIAhgBIhMCCAE%3D decoded",
    browseId: "FEsubscriptions",
    params: decodeURIComponent(LATEST_PARAMS),
  },
  { id: "memberships", label: "FEmemberships", browseId: "FEmemberships" },
  { id: "spunlimited", label: "SPunlimited", browseId: "SPunlimited" },
  {
    id: "subs_referer_latest",
    label: "Subs browseId, Referer /feed/subscriptions?flow=2",
    browseId: "FEsubscriptions",
    referer: `${YT_ORIGIN}/feed/subscriptions?flow=2`,
  },
];
