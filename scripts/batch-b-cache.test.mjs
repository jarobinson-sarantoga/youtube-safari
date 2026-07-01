/** Batch B — cache, snapshots, append merge */
import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { parseFeedResult } from "../dist/sidebar/parse-core.js";
import {
  buildSnapshotFields,
  fromShortsFeedCache,
  mergeAppendFeedItems,
  toShortsFeedCache,
} from "../dist/test-lib/index.js";
import { shortItem, validShortItem } from "./lib/test/feed-item.mjs";

describe("Batch B — shorts feed cache", () => {
  test("round-trips continuation token", () => {
    const cache = toShortsFeedCache([validShortItem], "tok");
    assert.equal(fromShortsFeedCache(cache).continuation, "tok");
  });

  test("blank continuation omits field on restore", () => {
    const cache = toShortsFeedCache([validShortItem], "");
    assert.equal(fromShortsFeedCache(cache).continuation, undefined);
  });

  test("null continuation stored as empty", () => {
    assert.equal(toShortsFeedCache([validShortItem], null).continuation, "");
  });

  test("items reference preserved", () => {
    const items = [validShortItem, shortItem("def456uvw78")];
    assert.equal(fromShortsFeedCache(toShortsFeedCache(items, "x")).items.length, 2);
  });
});

describe("Batch B — buildSnapshotFields", () => {
  test("shorts tab includes continuation and selectedIndex", () => {
    const snap = buildSnapshotFields(
      "shorts",
      [validShortItem],
      "cont-token",
      3,
      (n) => `${n} videos`,
      "",
    );
    assert.equal(snap.shortsContinuation, "cont-token");
    assert.equal(snap.selectedIndex, 3);
    assert.equal(snap.statusText, "1 videos");
  });

  test("home tab omits shortsContinuation", () => {
    const snap = buildSnapshotFields("home", [validShortItem], "ignored", 0, () => "", "hint");
    assert.equal(snap.shortsContinuation, undefined);
    assert.equal(snap.emptyHint, "hint");
  });

  test("empty items → empty statusText", () => {
    const snap = buildSnapshotFields("shorts", [], "c", -1, () => "5 videos", "none");
    assert.equal(snap.statusText, "");
  });
});

describe("Batch B — mergeAppendFeedItems", () => {
  test("appends only new videoIds", () => {
    const base = [shortItem("a"), shortItem("b")];
    const { items, added } = mergeAppendFeedItems(base, [shortItem("b"), shortItem("c")]);
    assert.deepEqual(added, ["c"]);
    assert.deepEqual(items.map((i) => i.videoId), ["a", "b", "c"]);
  });

  test("empty incoming → no added", () => {
    const { added } = mergeAppendFeedItems([shortItem("a")], []);
    assert.deepEqual(added, []);
  });

  test("all duplicates → unchanged length", () => {
    const { items, added } = mergeAppendFeedItems([shortItem("a")], [shortItem("a")]);
    assert.deepEqual(added, []);
    assert.equal(items.length, 1);
  });

  test("does not mutate original base array", () => {
    const base = [shortItem("a")];
    mergeAppendFeedItems(base, [shortItem("b")]);
    assert.equal(base.length, 1);
  });
});

describe("Batch B — parseFeedResult append guard", () => {
  test("append only on shorts tab", () => {
    assert.equal(parseFeedResult({ tab: "shorts", items: [validShortItem], append: true }).append, true);
    assert.equal(parseFeedResult({ tab: "home", items: [validShortItem], append: true }).append, undefined);
    assert.equal(parseFeedResult({ tab: "search", items: [], append: true }).append, undefined);
  });

  test("continuation preserved for shorts", () => {
    const r = parseFeedResult({
      tab: "shorts",
      items: [validShortItem],
      continuation: "seq-token",
    });
    assert.equal(r.continuation, "seq-token");
  });
});
