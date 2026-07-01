/** Batch A — queue lifecycle vectors */
import assert from "node:assert/strict";
import { describe, test } from "node:test";
import {
  clampQueueStartIndex,
  dedupeVideoIds,
  resolveQueueIndexByVideoId,
  sameQueueOrder,
  shouldSeekExistingQueue,
} from "../dist/test-lib/index.js";

describe("Batch A — dedupeVideoIds", () => {
  test("empty input → empty output", () => {
    assert.deepEqual(dedupeVideoIds([]), []);
  });

  test("drops empty strings", () => {
    assert.deepEqual(dedupeVideoIds(["", "abc123xyz12", ""]), ["abc123xyz12"]);
  });

  test("preserves first occurrence order", () => {
    assert.deepEqual(dedupeVideoIds(["a", "b", "a", "c", "b"]), ["a", "b", "c"]);
  });

  test("all unique passes through", () => {
    const ids = ["id1", "id2", "id3"];
    assert.deepEqual(dedupeVideoIds(ids), ids);
  });
});

describe("Batch A — sameQueueOrder / shouldSeekExistingQueue", () => {
  test("identical arrays match", () => {
    assert.equal(sameQueueOrder(["a", "b"], ["a", "b"]), true);
  });

  test("different length → no match", () => {
    assert.equal(sameQueueOrder(["a"], ["a", "b"]), false);
  });

  test("same ids different order → no match", () => {
    assert.equal(sameQueueOrder(["a", "b"], ["b", "a"]), false);
  });

  test("seek when active queue same source and order", () => {
    const active = { source: "shorts", videoIds: ["x", "y"] };
    assert.equal(shouldSeekExistingQueue(active, ["x", "y"], "shorts"), true);
  });

  test("no seek when source differs", () => {
    const active = { source: "shorts", videoIds: ["x"] };
    assert.equal(shouldSeekExistingQueue(active, ["x"], "subs-shorts"), false);
  });

  test("no seek when active is null", () => {
    assert.equal(shouldSeekExistingQueue(null, ["x"], "shorts"), false);
  });

  test("no seek when ids reordered", () => {
    const active = { source: "shorts", videoIds: ["x", "y"] };
    assert.equal(shouldSeekExistingQueue(active, ["y", "x"], "shorts"), false);
  });
});

describe("Batch A — clampQueueStartIndex", () => {
  test("negative clamped to 0", () => {
    assert.equal(clampQueueStartIndex(-5, 10), 0);
  });

  test("beyond length clamped to last", () => {
    assert.equal(clampQueueStartIndex(99, 3), 2);
  });

  test("in-range unchanged", () => {
    assert.equal(clampQueueStartIndex(1, 5), 1);
  });

  test("empty queue → 0", () => {
    assert.equal(clampQueueStartIndex(3, 0), 0);
  });
});

describe("Batch A — resolveQueueIndexByVideoId", () => {
  test("finds index in queue", () => {
    assert.equal(resolveQueueIndexByVideoId("b", ["a", "b", "c"]), 1);
  });

  test("missing video → -1 (no playlist-pos fallback)", () => {
    assert.equal(resolveQueueIndexByVideoId("z", ["a", "b"]), -1);
  });

  test("empty videoId → -1", () => {
    assert.equal(resolveQueueIndexByVideoId("", ["a"]), -1);
  });

  test("empty queue → -1", () => {
    assert.equal(resolveQueueIndexByVideoId("a", []), -1);
  });
});
