#!/usr/bin/env node
import crypto from "node:crypto";
import fs from "node:fs";
import { parseSubscriptionsGridItems } from "../src/browse/api/parsers.ts";

const raw = fs.readFileSync(`${process.env.HOME}/.config/yt-dlp/cookies.txt`, "utf8");
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

const home = await fetch("https://www.youtube.com/");
const html = await home.text();
const key = html.match(/"INNERTUBE_API_KEY":"([^"]+)"/)?.[1];
const ver = html.match(/"INNERTUBE_CLIENT_VERSION":"([^"]+)"/)?.[1];

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
  body: JSON.stringify({
    context: { client: { clientName: "WEB", clientVersion: ver, hl: "en", gl: "US" } },
    browseId: "FEsubscriptions",
  }),
});
const data = await res.json();

const latest = parseSubscriptionsGridItems(data, "latest");
const activity = parseSubscriptionsGridItems(data, "activity");

console.log(`latest: ${latest.length} items, first: ${latest[0]?.title?.slice(0, 50)} (${latest[0]?.videoId})`);
console.log(`activity: ${activity.length} items, first: ${activity[0]?.title?.slice(0, 50)} (${activity[0]?.videoId})`);

const latestIds = new Set(latest.map((i) => i.videoId));
const overlap = activity.filter((i) => latestIds.has(i.videoId)).length;
console.log(`overlap: ${overlap}/${activity.length} activity items also in latest`);
console.log(`same first video: ${latest[0]?.videoId === activity[0]?.videoId}`);