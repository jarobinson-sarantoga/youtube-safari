/** Batch A — selection sync vectors */
import assert from "node:assert/strict";
import { describe, test } from "node:test";
import {
  resolveFeedSelectionIndex,
  resolveShortsQueueSelectionIndex,
  shouldAcceptShortsQueueState,
} from "../dist/test-lib/index.js";
import { feedItem } from "./lib/test/feed-item.mjs";

describe("Batch A — resolveFeedSelectionIndex", () => {
  const items = [feedItem("a"), feedItem("b"), feedItem("c")];

  test("empty list → -1", () => {
    assert.equal(resolveFeedSelectionIndex([], "a"), -1);
  });

  test("preserves selection when video still present", () => {
    assert.equal(resolveFeedSelectionIndex(items, "b"), 1);
  });

  test("falls back to 0 when previous video gone", () => {
    assert.equal(resolveFeedSelectionIndex(items, "missing"), 0);
  });

  test("null previous → index 0", () => {
    assert.equal(resolveFeedSelectionIndex(items, null), 0);
  });

  test("single item list preserves match", () => {
    assert.equal(resolveFeedSelectionIndex([feedItem("only")], "only"), 0);
  });
});

describe("Batch A — shouldAcceptShortsQueueState", () => {
  test("shorts source only on shorts tab", () => {
    assert.equal(shouldAcceptShortsQueueState("shorts", "shorts", "all"), true);
    assert.equal(shouldAcceptShortsQueueState("shorts", "home", "all"), false);
  });

  test("subs-shorts only on subscriptions + shorts filter", () => {
    assert.equal(
      shouldAcceptShortsQueueState("subs-shorts", "subscriptions", "shorts"),
      true,
    );
    assert.equal(
      shouldAcceptShortsQueueState("subs-shorts", "subscriptions", "all"),
      false,
    );
    assert.equal(shouldAcceptShortsQueueState("subs-shorts", "shorts", "shorts"), false);
  });

  test("undefined source rejected", () => {
    assert.equal(shouldAcceptShortsQueueState(undefined, "shorts", "all"), false);
  });
});

describe("Batch A — resolveShortsQueueSelectionIndex", () => {
  const items = [feedItem("v0"), feedItem("v1"), feedItem("v2")];

  test("prefers videoId over fallback index", () => {
    assert.equal(resolveShortsQueueSelectionIndex("v2", 0, items, -1), 2);
  });

  test("uses fallback when videoId not in list", () => {
    assert.equal(resolveShortsQueueSelectionIndex("missing", 1, items, -1), 1);
  });

  test("returns null when index equals current (no-op)", () => {
    assert.equal(resolveShortsQueueSelectionIndex("v1", 1, items, 1), null);
  });

  test("returns null when fallback negative", () => {
    assert.equal(resolveShortsQueueSelectionIndex("v0", -1, items, 0), null);
  });

  test("returns null when index out of range", () => {
    assert.equal(resolveShortsQueueSelectionIndex(undefined, 5, items, 0), null);
  });
});
