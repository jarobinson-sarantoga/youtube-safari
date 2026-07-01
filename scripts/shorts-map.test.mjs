import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { describe, test } from "node:test";
import { extractContinuation } from "./lib/shorts/continuation.mjs";
import { mergeUniqueVideoItems } from "./lib/shorts/merge-items.mjs";
import { mapReelSequenceEntries } from "./lib/shorts/map-sequence.mjs";

const fixturePath = path.join("scripts", "fixtures", "shorts-sequence.json");
const fixture = JSON.parse(fs.readFileSync(fixturePath, "utf8"));

function entryFromFixture(item) {
  return {
    payload: {
      videoId: item.videoId,
      unserializedPrefetchData: {
        playerResponse: {
          videoDetails: {
            title: item.title,
            author: item.channelTitle,
            channelId: item.channelId,
          },
        },
      },
      thumbnail: { thumbnails: [{ url: item.thumbnailUrl }] },
    },
  };
}

describe("shorts map — fixture", () => {
  test("maps all fixture items with isShort", () => {
    const mapped = mapReelSequenceEntries(fixture.items.map(entryFromFixture));
    assert.equal(mapped.length, fixture.items.length);
    assert.equal(mapped[0].isShort, true);
    assert.equal(mapped[0].videoId, fixture.items[0].videoId);
  });
});

describe("shorts map — dedupe and fallbacks", () => {
  test("dedupes duplicate videoIds", () => {
    const mapped = mapReelSequenceEntries([
      { payload: { videoId: "abc123xyz12" } },
      { payload: { videoId: "abc123xyz12" } },
    ]);
    assert.equal(mapped.length, 1);
  });

  test("uses oardefault thumb when thumbnail missing", () => {
    const mapped = mapReelSequenceEntries([{ payload: { videoId: "abc123xyz12" } }]);
    assert.match(mapped[0].thumbnailUrl, /abc123xyz12/);
  });

  test("skips entries without videoId", () => {
    assert.equal(mapReelSequenceEntries([{ payload: {} }]).length, 0);
  });

  test("non-array entries → empty", () => {
    assert.deepEqual(mapReelSequenceEntries(null), []);
  });
});

describe("shorts continuation — token priority", () => {
  test("prefers continuation_endpoint token", () => {
    assert.equal(extractContinuation({ continuation_endpoint: { token: "abc123" } }), "abc123");
  });

  test("reelWatchSequenceEndpoint beats continuationCommand", () => {
    assert.equal(
      extractContinuation({
        continuationEndpoint: {
          reelWatchSequenceEndpoint: { sequenceParams: "seq" },
          continuationCommand: { token: "cmd" },
        },
      }),
      "seq",
    );
  });

  test("ignores unstable entry params", () => {
    assert.equal(
      extractContinuation({ entries: [{ payload: { params: "stale-token" } }] }),
      null,
    );
  });

  test("ignores whitespace-only tokens", () => {
    assert.equal(extractContinuation({ continuation_endpoint: { token: "  " } }), null);
  });
});

describe("shorts merge — bridge batches", () => {
  test("mergeUniqueVideoItems keeps first title", () => {
    const merged = mergeUniqueVideoItems(
      [{ videoId: "a", title: "First" }],
      [{ videoId: "a", title: "Second" }],
    );
    assert.equal(merged[0].title, "First");
  });
});
