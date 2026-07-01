import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { test } from "node:test";
import { mapReelSequenceEntries } from "./lib/shorts/map-sequence.mjs";
import { extractContinuation } from "./lib/shorts/continuation.mjs";

const fixturePath = path.join("scripts", "fixtures", "shorts-sequence.json");
const fixture = JSON.parse(fs.readFileSync(fixturePath, "utf8"));

test("mapReelSequenceEntries maps fixture items with isShort", () => {
  const mapped = mapReelSequenceEntries(
    fixture.items.map((item) => ({
      type: "NavigationEndpoint",
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
        thumbnail: {
          thumbnails: [{ url: item.thumbnailUrl }],
        },
      },
    })),
  );

  assert.equal(mapped.length, fixture.items.length);
  assert.equal(mapped[0].isShort, true);
  assert.equal(mapped[0].videoId, fixture.items[0].videoId);
});

test("extractContinuation prefers continuation_endpoint token", () => {
  const token = "abc123";
  assert.equal(
    extractContinuation({ continuation_endpoint: { token } }),
    token,
  );
});
