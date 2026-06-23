import { UA, YT_ORIGIN } from "./innertube-constants.mjs";
import { buildContext, CLIENTS } from "./innertube-clients.mjs";

export async function innertubeBrowse({
  config,
  cookieHeader,
  authorization,
  clientKey,
  browseId,
  params,
}) {
  const spec = CLIENTS[clientKey];
  const url = `${YT_ORIGIN}/youtubei/v1/browse?key=${config.apiKey}&prettyPrint=false`;
  const body = {
    context: buildContext(clientKey, config.clientVersion),
    browseId,
  };
  if (params) body.params = params;

  const headers = {
    "Content-Type": "application/json",
    "User-Agent": UA,
    Origin: YT_ORIGIN,
    Referer: `${YT_ORIGIN}/feed/subscriptions`,
    "X-YouTube-Client-Name": spec.clientId,
    "X-YouTube-Client-Version": config.clientVersion,
    Accept: "*/*",
    "Accept-Language": "en-US,en;q=0.9",
  };
  if (cookieHeader) headers.Cookie = cookieHeader;
  if (authorization) headers.Authorization = authorization;
  if (authorization) headers["X-Goog-AuthUser"] = "0";

  const res = await fetch(url, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });

  const text = await res.text();
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    data = { _parseError: true, _preview: text.slice(0, 500) };
  }

  return { status: res.status, data, body };
}

export async function webBrowse(
  config,
  { browseId, params, referer },
  cookieHeader,
  auth,
) {
  const url = `${YT_ORIGIN}/youtubei/v1/browse?key=${config.apiKey}&prettyPrint=false`;
  const body = {
    context: {
      client: {
        clientName: "WEB",
        clientVersion: config.clientVersion,
        hl: "en",
        gl: "US",
        originalUrl: `${YT_ORIGIN}/feed/subscriptions`,
        platform: "DESKTOP",
      },
      user: {},
      request: {},
    },
    browseId,
  };
  if (params) body.params = params;

  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "User-Agent": UA,
      Origin: YT_ORIGIN,
      Referer: referer || `${YT_ORIGIN}/feed/subscriptions`,
      "X-YouTube-Client-Name": "1",
      "X-YouTube-Client-Version": config.clientVersion,
      Cookie: cookieHeader,
      Authorization: auth,
      "X-Goog-AuthUser": "0",
    },
    body: JSON.stringify(body),
  });

  const data = await res.json();
  return { status: res.status, data };
}
