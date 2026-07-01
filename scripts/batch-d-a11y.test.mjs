/** Batch D — ARIA roles and portrait layout */
import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { feedListA11y, usePortraitRows } from "../dist/test-lib/index.js";

describe("Batch D — feedListA11y roles", () => {
  test("shorts grid → role grid, Shorts feed label", () => {
    assert.deepEqual(feedListA11y(true, false), { role: "grid", label: "Shorts feed" });
  });

  test("shorts list → role listbox", () => {
    assert.deepEqual(feedListA11y(false, true), { role: "listbox", label: "Video feed" });
  });

  test("default home → role list", () => {
    assert.deepEqual(feedListA11y(false, false), { role: "list", label: "Video feed" });
  });
});

describe("Batch D — usePortraitRows", () => {
  test("shorts tab always portrait", () => {
    assert.equal(usePortraitRows("shorts", "all"), true);
  });

  test("subscriptions + shorts filter", () => {
    assert.equal(usePortraitRows("subscriptions", "shorts"), true);
  });

  test("subscriptions all → landscape", () => {
    assert.equal(usePortraitRows("subscriptions", "all"), false);
  });

  test("home → landscape", () => {
    assert.equal(usePortraitRows("home", "all"), false);
  });
});
