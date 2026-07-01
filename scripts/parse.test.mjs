import assert from "node:assert/strict";
import { test } from "node:test";
import { isFeedItem, parseFeedResult } from "../dist/sidebar/parse-core.js";

const validItem = {
  videoId: "dQw4w9WgXcQ",
  title: "Test Video",
  channelTitle: "Test Channel",
  thumbnailUrl: "https://i.ytimg.com/vi/dQw4w9WgXcQ/hqdefault.jpg",
};

test("isFeedItem accepts a valid feed row", () => {
  assert.equal(isFeedItem(validItem), true);
});

test("isFeedItem rejects rows missing required fields", () => {
  assert.equal(isFeedItem(null), false);
  assert.equal(isFeedItem({}), false);
  assert.equal(isFeedItem({ ...validItem, videoId: "" }), false);
  assert.equal(isFeedItem({ ...validItem, title: 42 }), false);
});

test("isFeedItem accepts optional isShort", () => {
  assert.equal(isFeedItem({ ...validItem, isShort: true }), true);
  assert.equal(isFeedItem({ ...validItem, isShort: "yes" }), false);
});

test("parseFeedResult returns null for invalid payloads", () => {
  assert.equal(parseFeedResult(null), null);
  assert.equal(parseFeedResult({ tab: "nope", items: [] }), null);
  assert.equal(parseFeedResult({ tab: "home" }), null);
});

test("parseFeedResult filters invalid items and keeps valid ones", () => {
  const result = parseFeedResult({
    tab: "home",
    items: [validItem, { videoId: "bad" }, null, { ...validItem, videoId: "abc123xyz12" }],
    requestId: 7,
  });

  assert.ok(result);
  assert.equal(result.tab, "home");
  assert.equal(result.requestId, 7);
  assert.equal(result.items.length, 2);
  assert.equal(result.items[0].videoId, validItem.videoId);
  assert.equal(result.items[1].videoId, "abc123xyz12");
});

test("parseFeedResult ignores append on non-shorts tabs", () => {
  const result = parseFeedResult({
    tab: "home",
    items: [validItem],
    append: true,
  });
  assert.ok(result);
  assert.equal(result.append, undefined);
});

test("parseFeedResult accepts shorts tab and continuation", () => {
  const result = parseFeedResult({
    tab: "shorts",
    items: [{ ...validItem, isShort: true }],
    continuation: "token",
    append: true,
  });
  assert.ok(result);
  assert.equal(result.tab, "shorts");
  assert.equal(result.continuation, "token");
  assert.equal(result.append, true);
});

test("parseFeedResult preserves error and emptyHint", () => {
  const result = parseFeedResult({
    tab: "search",
    items: [],
    error: "network down",
    emptyHint: "Nothing here",
    query: "cats",
  });

  assert.ok(result);
  assert.equal(result.error, "network down");
  assert.equal(result.emptyHint, "Nothing here");
  assert.equal(result.query, "cats");
});