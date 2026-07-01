import assert from "node:assert/strict";
import { test } from "node:test";
import {
  fromShortsFeedCache,
  toShortsFeedCache,
} from "../dist/browse/feeds/shorts-cache.js";

const sampleItems = [
  {
    videoId: "abc123xyz12",
    title: "Short",
    channelTitle: "Channel",
    thumbnailUrl: "https://example.com/thumb.jpg",
    isShort: true,
  },
];

test("shorts cache round-trips items and continuation", () => {
  const cache = toShortsFeedCache(sampleItems, "token-123");
  assert.equal(cache.continuation, "token-123");
  assert.equal(cache.items.length, 1);

  const restored = fromShortsFeedCache(cache);
  assert.equal(restored.continuation, "token-123");
  assert.equal(restored.items[0].videoId, "abc123xyz12");
});

test("shorts cache stores empty continuation as blank string", () => {
  const cache = toShortsFeedCache(sampleItems, null);
  assert.equal(cache.continuation, "");
  assert.equal(fromShortsFeedCache(cache).continuation, undefined);
});
