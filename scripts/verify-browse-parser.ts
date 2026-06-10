import crypto from "node:crypto";
import fs from "node:fs";
import { parseFeedItems } from "../src/browse/api/parsers";

async function main(): Promise<void> {
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
  const sapisid = cookies.find((c) => c.name === "SAPISID" && c.domain.includes("youtube.com"))
    ?.value;
  const ts = Math.floor(Date.now() / 1000);
  const hash = crypto
    .createHash("sha1")
    .update(`${ts} ${sapisid} https://www.youtube.com`)
    .digest("hex");
  const auth = `SAPISIDHASH ${ts}_${hash}`;

  const home = await fetch("https://www.youtube.com/");
  const html = await home.text();
  const key = html.match(/"INNERTUBE_API_KEY":"([^"]+)"/)?.[1];
  const ver = (html.match(/"INNERTUBE_CLIENT_VERSION":"([^"]+)"/) || [])[1];
  if (!key || !ver) {
    throw new Error("Failed to scrape InnerTube config");
  }

  for (const [label, body] of [
    ["latest", { browseId: "FEsubscriptions", params: "EgIIAhgBIhMCCAE%3D" }],
    ["subs", { browseId: "FEsubscriptions" }],
  ] as const) {
    const res = await fetch(
      `https://www.youtube.com/youtubei/v1/browse?key=${key}&prettyPrint=false`,
      {
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
          ...body,
        }),
      },
    );
    const data = await res.json();
    const items = parseFeedItems(data);
    console.log(`${label}: parsed ${items.length} items`);
    if (items[0]) {
      console.log(`  first: ${items[0].title} — ${items[0].channelTitle}`);
    }
  }
}

void main();