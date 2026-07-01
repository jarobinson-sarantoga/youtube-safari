import assert from "node:assert/strict";
import { test } from "node:test";
import { buildWatchUrlM3U } from "../dist/test-lib/index.js";

test("buildWatchUrlM3U emits watch URLs", () => {
  const m3u = buildWatchUrlM3U([
    { title: "One", url: "https://www.youtube.com/watch?v=abc123xyz12" },
    { title: "Two", url: "https://www.youtube.com/watch?v=def456uvw78" },
  ]);
  assert.match(m3u, /^#EXTM3U/);
  assert.match(m3u, /watch\?v=abc123xyz12/);
  assert.match(m3u, /watch\?v=def456uvw78/);
});
