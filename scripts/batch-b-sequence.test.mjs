/** Batch B — sequence continuation and bridge merge */
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { describe, test } from "node:test";
import { extractContinuation } from "./lib/shorts/continuation.mjs";
import { mergeUniqueVideoItems } from "./lib/shorts/merge-items.mjs";
import { mapReelSequenceEntries } from "./lib/shorts/map-sequence.mjs";
import { isFeedItem } from "../dist/sidebar/parse-core.js";

describe("Batch B — extractContinuation vectors", () => {
  test("continuation_endpoint.token", () => {
    assert.equal(extractContinuation({ continuation_endpoint: { token: "t1" } }), "t1");
  });

  test("reelWatchSequenceEndpoint.sequenceParams", () => {
    assert.equal(
      extractContinuation({
        continuationEndpoint: { reelWatchSequenceEndpoint: { sequenceParams: "t2" } },
      }),
      "t2",
    );
  });

  test("continuationCommand.token", () => {
    assert.equal(
      extractContinuation({ continuationEndpoint: { continuationCommand: { token: "t3" } } }),
      "t3",
    );
  });

  test("empty token ignored", () => {
    assert.equal(extractContinuation({ continuation_endpoint: { token: "" } }), null);
  });

  test("whitespace-only token ignored", () => {
    assert.equal(extractContinuation({ continuation_endpoint: { token: "  " } }), null);
  });

  test("no continuation → null", () => {
    assert.equal(extractContinuation({ entries: [] }), null);
  });
});

describe("Batch B — mergeUniqueVideoItems", () => {
  test("merges without duplicates", () => {
    const merged = mergeUniqueVideoItems(
      [{ videoId: "a", title: "A" }],
      [{ videoId: "a", title: "A2" }, { videoId: "b", title: "B" }],
    );
    assert.deepEqual(merged.map((i) => i.videoId), ["a", "b"]);
  });

  test("skips entries without videoId", () => {
    assert.equal(mergeUniqueVideoItems([{ videoId: "a" }], [{ title: "no id" }]).length, 1);
  });

  test("preserves base order", () => {
    const merged = mergeUniqueVideoItems(
      [{ videoId: "x" }, { videoId: "y" }],
      [{ videoId: "z" }, { videoId: "w" }],
    );
    assert.deepEqual(merged.map((i) => i.videoId), ["x", "y", "z", "w"]);
  });
});

describe("Batch B — mapReelSequenceEntries fixture", () => {
  const fixture = JSON.parse(
    fs.readFileSync(path.join("scripts", "fixtures", "shorts-sequence.json"), "utf8"),
  );

  test("maps all fixture entries with isShort", () => {
    const entries = fixture.items.map((row) => ({
      payload: {
        videoId: row.videoId,
        unserializedPrefetchData: {
          playerResponse: { videoDetails: { title: row.title, author: row.channelTitle } },
        },
        thumbnail: { thumbnails: [{ url: row.thumbnailUrl }] },
      },
    }));
    const mapped = mapReelSequenceEntries(entries);
    assert.equal(mapped.length, fixture.items.length);
    assert.ok(mapped.every((row) => row.isShort === true));
    assert.ok(mapped.every((row) => isFeedItem(row)));
  });

  test("dedupes duplicate videoIds in one batch", () => {
    const dup = mapReelSequenceEntries([
      { payload: { videoId: "abc123xyz12" } },
      { payload: { videoId: "abc123xyz12" } },
    ]);
    assert.equal(dup.length, 1);
  });
});
