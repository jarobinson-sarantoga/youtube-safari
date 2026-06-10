#!/usr/bin/env node
import crypto from "node:crypto";
import fs from "node:fs";

const raw = fs.readFileSync(`${process.env.HOME}/.config/yt-dlp/cookies.txt`, "utf8");
const cookies = raw.split(/\r?\n/).filter((l) => l && !l.startsWith("#")).map((l) => {
  const p = l.split("\t");
  return { domain: p[0], name: p[5], value: p[6] };
});
const cookieHeader = cookies.filter((c) => c.domain.includes("youtube.com")).map((c) => `${c.name}=${c.value}`).join("; ");
const sapisid = cookies.find((c) => c.name === "SAPISID" && c.domain.includes("youtube.com"))?.value;
const ts = Math.floor(Date.now() / 1000);
const hash = crypto.createHash("sha1").update(`${ts} ${sapisid} https://www.youtube.com`).digest("hex");
const auth = `SAPISIDHASH ${ts}_${hash}`;
const home = await fetch("https://www.youtube.com/");
const html = await home.text();
const key = html.match(/"INNERTUBE_API_KEY":"([^"]+)"/)[1];
const ver = (html.match(/"INNERTUBE_CLIENT_VERSION":"([^"]+)"/) || [])[1];
const res = await fetch(`https://www.youtube.com/youtubei/v1/browse?key=${key}&prettyPrint=false`, {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    Cookie: cookieHeader,
    Authorization: auth,
    "X-Goog-AuthUser": "0",
    Origin: "https://www.youtube.com",
    Referer: "https://www.youtube.com/feed/subscriptions",
  },
  body: JSON.stringify({
    context: { client: { clientName: "WEB", clientVersion: ver, hl: "en", gl: "US" } },
    browseId: "FEsubscriptions",
  }),
});
const data = await res.json();
function findLockup(o) {
  if (!o || typeof o !== "object") return null;
  if (o.lockupViewModel) return o.lockupViewModel;
  for (const v of Object.values(o)) {
    const f = Array.isArray(v) ? v.map(findLockup).find(Boolean) : findLockup(v);
    if (f) return f;
  }
  return null;
}
console.log(JSON.stringify(findLockup(data), null, 2));