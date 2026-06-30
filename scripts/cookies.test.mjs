import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { test } from "node:test";
import {
  buildBrowseCookieHeader,
  hasBrowseAuthCookies,
  hasYouTubeAuthCookies,
  parseNetscapeCookies,
  resolveSidAuthValue,
} from "./lib/youtube-cookies.mjs";

const sample = [
  "# Netscape HTTP Cookie File",
  ".youtube.com\tTRUE\t/\tTRUE\t2000000000\tLOGIN_INFO\tabc",
  ".youtube.com\tTRUE\t/\tTRUE\t2000000000\t__Secure-3PSID\txyz",
  ".youtube.com\tTRUE\t/\tTRUE\t2000000000\t__Secure-3PAPISID\tpapisid",
  ".google.com\tTRUE\t/\tTRUE\t2000000000\tSAPISID\tgoogle-auth",
  ".google.com\tTRUE\t/\tTRUE\t2000000000\tSID\tgoogle-sid",
  ".reddit.com\tTRUE\t/\tFALSE\t2000000000\tloid\tignore-me",
].join("\n");

test("buildBrowseCookieHeader keeps youtube.com cookies only", () => {
  const cookies = parseNetscapeCookies(sample);
  const header = buildBrowseCookieHeader(cookies);
  assert.match(header, /LOGIN_INFO=abc/);
  assert.match(header, /__Secure-3PSID=xyz/);
  assert.match(header, /__Secure-3PAPISID=papisid/);
  assert.doesNotMatch(header, /google-auth/);
  assert.doesNotMatch(header, /loid=/);
});

test("resolveSidAuthValue prefers youtube.com PAPISID over google SAPISID", () => {
  const cookies = parseNetscapeCookies(sample);
  assert.equal(resolveSidAuthValue(cookies), "papisid");
});

test("hasBrowseAuthCookies requires youtube login and sid auth cookie", () => {
  const cookies = parseNetscapeCookies(sample);
  assert.equal(hasYouTubeAuthCookies(cookies), true);
  assert.equal(hasBrowseAuthCookies(cookies), true);

  const withoutPapisid = cookies.filter((cookie) => cookie.name !== "__Secure-3PAPISID");
  assert.equal(hasBrowseAuthCookies(withoutPapisid), false);
});

test("readBrowseCookieHeader uses youtube-only auth cookies from cookie file", async () => {
  const { readBrowseCookieHeader } = await import("./youtubejs-lib.mjs");
  const filePath = path.join(os.tmpdir(), `yt-cookies-${process.pid}.txt`);
  fs.writeFileSync(filePath, sample);
  try {
    const header = readBrowseCookieHeader(filePath);
    assert.match(header, /__Secure-3PAPISID=papisid/);
    assert.doesNotMatch(header, /SAPISID=google-auth/);
  } finally {
    fs.unlinkSync(filePath);
  }
});
