import crypto from "node:crypto";
import fs from "node:fs";

export function loadYouTubeCookies(cookiePath = `${process.env.HOME}/.config/yt-dlp/cookies.txt`) {
  const raw = fs.readFileSync(cookiePath, "utf8");
  const cookies = raw
    .split(/\r?\n/)
    .filter((l) => l && !l.startsWith("#"))
    .map((l) => {
      const p = l.split("\t");
      return { domain: p[0], name: p[5], value: p[6] };
    });
  const cookieHeader = cookies
    .filter((c) => c.domain.includes("youtube.com"))
    .map((c) => `${c.name}=${c.value}`)
    .join("; ");
  const sapisid = cookies.find((c) => c.name === "SAPISID" && c.domain.includes("youtube.com"))?.value;
  const ts = Math.floor(Date.now() / 1000);
  const auth = `SAPISIDHASH ${ts}_${crypto.createHash("sha1").update(`${ts} ${sapisid} https://www.youtube.com`).digest("hex")}`;
  return { cookieHeader, auth };
}

export async function fetchInnerTubeContext() {
  const home = await fetch("https://www.youtube.com/");
  const html = await home.text();
  return {
    key: html.match(/"INNERTUBE_API_KEY":"([^"]+)"/)?.[1],
    ver: html.match(/"INNERTUBE_CLIENT_VERSION":"([^"]+)"/)?.[1],
  };
}

export function createBrowseClient({ key, ver, cookieHeader, auth }) {
  return async function browse(params) {
    const body = {
      context: { client: { clientName: "WEB", clientVersion: ver, hl: "en", gl: "US" } },
      browseId: "FEsubscriptions",
    };
    if (params) body.params = params;
    const res = await fetch(`https://www.youtube.com/youtubei/v1/browse?key=${key}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: cookieHeader,
        Authorization: auth,
        "X-Goog-AuthUser": "0",
        Origin: "https://www.youtube.com",
        Referer: "https://www.youtube.com/feed/subscriptions",
      },
      body: JSON.stringify(body),
    });
    return res.json();
  };
}

export function gridContents(data) {
  return (
    data?.contents?.twoColumnBrowseResultsRenderer?.tabs?.[0]?.tabRenderer?.content
      ?.richGridRenderer?.contents || []
  );
}
