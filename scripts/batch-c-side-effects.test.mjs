/** Batch C — playback side-effect suppression */
import assert from "node:assert/strict";
import { describe, test } from "node:test";
import {
  clampQueueStartIndex,
  dedupeVideoIds,
  sameQueueOrder,
  shouldRunPlaybackSideEffects,
  shouldSeekExistingQueue,
} from "../dist/test-lib/index.js";

describe("Batch C — shouldRunPlaybackSideEffects", () => {
  test("queue active suppresses side effects", () => {
    assert.equal(shouldRunPlaybackSideEffects(true, false), false);
  });

  test("force bypasses queue suppression", () => {
    assert.equal(shouldRunPlaybackSideEffects(true, true), true);
  });

  test("no queue → run side effects", () => {
    assert.equal(shouldRunPlaybackSideEffects(false, false), true);
  });
});

describe("Batch C — playShortsQueue decision vectors", () => {
  test("dedupe before seek/open comparison", () => {
    const ids = dedupeVideoIds(["a", "a", "b"]);
    assert.equal(shouldSeekExistingQueue({ source: "shorts", videoIds: ids }, ids, "shorts"), true);
  });

  test("dedupe preserves order for seek match", () => {
    const active = { source: "shorts", videoIds: ["a", "b"] };
    const incoming = dedupeVideoIds(["a", "b", "a"]);
    assert.equal(sameQueueOrder(active.videoIds, incoming), true);
  });

  test("clamp start index for queue open", () => {
    assert.equal(clampQueueStartIndex(100, dedupeVideoIds(["x", "y", "z"]).length), 2);
  });
});

describe("Batch C — append dedupe vectors", () => {
  test("append list dedupes before push", () => {
    const existing = ["a", "b"];
    const toAdd = dedupeVideoIds(["b", "c", "c"]);
    const merged = [...existing];
    for (const id of toAdd) {
      if (!merged.includes(id)) merged.push(id);
    }
    assert.deepEqual(merged, ["a", "b", "c"]);
  });

  test("all duplicates → no change", () => {
    const existing = ["a", "b"];
    const added = dedupeVideoIds(["a", "b"]).filter((id) => !existing.includes(id));
    assert.deepEqual(added, []);
  });
});

describe("Batch C — quality switch queue rebuild index", () => {
  test("playlist pos clamped to queue length", () => {
    assert.equal(clampQueueStartIndex(99, 5), 4);
  });

  test("zero pos at start", () => {
    assert.equal(clampQueueStartIndex(0, 10), 0);
  });
});
