/** Batch A — queue state lifecycle (no IINA runtime) */
import assert from "node:assert/strict";
import { describe, test } from "node:test";
import {
  exitShortsQueue,
  getActiveShortsQueue,
  setActiveShortsQueue,
} from "../dist/test-lib/index.js";

describe("Batch A — exitShortsQueue lifecycle", () => {
  test("set then exit clears active queue", () => {
    setActiveShortsQueue("shorts", ["a", "b"]);
    assert.ok(getActiveShortsQueue());
    exitShortsQueue();
    assert.equal(getActiveShortsQueue(), null);
  });

  test("exit on empty state is safe", () => {
    exitShortsQueue();
    assert.equal(getActiveShortsQueue(), null);
  });

  test("preserves source while active", () => {
    setActiveShortsQueue("subs-shorts", ["x"]);
    assert.equal(getActiveShortsQueue()?.source, "subs-shorts");
    exitShortsQueue();
  });

  test("stores video id list copy", () => {
    const ids = ["v1", "v2"];
    setActiveShortsQueue("shorts", ids);
    assert.deepEqual(getActiveShortsQueue()?.videoIds, ids);
    exitShortsQueue();
  });
});
