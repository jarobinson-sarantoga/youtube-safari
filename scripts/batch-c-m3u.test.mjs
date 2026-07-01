/** Batch C — M3U playlist generation */
import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { buildWatchUrlM3U } from "../dist/test-lib/index.js";

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
