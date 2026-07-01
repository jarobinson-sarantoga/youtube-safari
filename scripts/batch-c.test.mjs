/**
 * Batch C — playback side effects, M3U, queue play decisions
 */
import assert from "node:assert/strict";
import { describe, test } from "node:test";
import {
  buildWatchUrlM3U,
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

describe("Batch C — buildWatchUrlM3U", () => {
  test("emits EXTM3U header and watch URLs", () => {
    const m3u = buildWatchUrlM3U([
      { title: "One", url: "https://www.youtube.com/watch?v=abc123xyz12" },
      { title: "Two", url: "https://www.youtube.com/watch?v=def456uvw78" },
    ]);
    assert.match(m3u, /^#EXTM3U\n/);
    assert.match(m3u, /#EXTINF:0,One/);
    assert.match(m3u, /watch\?v=abc123xyz12/);
    assert.match(m3u, /watch\?v=def456uvw78/);
  });

  test("uses real titles in EXTINF", () => {
    const m3u = buildWatchUrlM3U([
      { title: "My Short Title", url: "https://www.youtube.com/watch?v=abc123xyz12" },
    ]);
    assert.match(m3u, /#EXTINF:0,My Short Title/);
  });

  test("strips newlines from titles", () => {
    const m3u = buildWatchUrlM3U([
      { title: "Line1\nLine2", url: "https://www.youtube.com/watch?v=abc123xyz12" },
    ]);
    assert.doesNotMatch(m3u, /\nLine2\n/);
    assert.match(m3u, /Line1 Line2/);
  });

  test("empty title falls back to YouTube", () => {
    const m3u = buildWatchUrlM3U([
      { title: "   ", url: "https://www.youtube.com/watch?v=abc123xyz12" },
    ]);
    assert.match(m3u, /#EXTINF:0,YouTube/);
  });

  test("single entry playlist", () => {
    const lines = buildWatchUrlM3U([
      { title: "Solo", url: "https://www.youtube.com/watch?v=abc123xyz12" },
    ]).split("\n");
    assert.equal(lines.length, 3);
  });
});

describe("Batch C — playShortsQueue decision vectors", () => {
  test("dedupe before seek/open comparison", () => {
    const raw = ["a", "a", "b"];
    const ids = dedupeVideoIds(raw);
    assert.equal(shouldSeekExistingQueue({ source: "shorts", videoIds: ids }, ids, "shorts"), true);
  });

  test("dedupe changes length → still matches after dedupe", () => {
    const active = { source: "shorts", videoIds: ["a", "b"] };
    const incoming = dedupeVideoIds(["a", "b", "a"]);
    assert.equal(sameQueueOrder(active.videoIds, incoming), true);
  });
  test("clamp start index for queue open", () => {
    const ids = dedupeVideoIds(["x", "y", "z"]);
    assert.equal(clampQueueStartIndex(100, ids.length), 2);
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
    const toAdd = dedupeVideoIds(["a", "b"]);
    const added = toAdd.filter((id) => !existing.includes(id));
    assert.deepEqual(added, []);
  });
});

describe("Batch C — quality switch queue rebuild index", () => {
  test("playlist pos clamped to queue length", () => {
    const queueLen = 5;
    const pos = 99;
    assert.equal(clampQueueStartIndex(pos, queueLen), 4);
  });

  test("zero pos at start", () => {
    assert.equal(clampQueueStartIndex(0, 10), 0);
  });
});
