import { UA, YT_ORIGIN } from "./innertube-constants.mjs";

export const CLIENTS = {
  WEB: { clientName: "WEB", clientId: "1" },
  WEB_REMIX: { clientName: "WEB_REMIX", clientId: "67" },
  ANDROID: {
    clientName: "ANDROID",
    clientId: "3",
    extra: { androidSdkVersion: 30, userAgent: UA },
  },
};

export function buildContext(clientKey, clientVersion) {
  const spec = CLIENTS[clientKey];
  const client = {
    clientName: spec.clientName,
    clientVersion,
    hl: "en",
    gl: "US",
    originalUrl: `${YT_ORIGIN}/`,
    platform: clientKey === "ANDROID" ? "MOBILE" : "DESKTOP",
    ...spec.extra,
  };
  return { client, user: {}, request: {} };
}
