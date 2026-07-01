/** Batch D — grid and list keyboard index math */
import assert from "node:assert/strict";
import { describe, test } from "node:test";
import {
  SHORTS_GRID_COLUMNS,
  computeGridSelectionIndex,
  computeListSelectionIndex,
} from "../dist/test-lib/index.js";

describe("Batch D — computeListSelectionIndex", () => {
  test("move down within bounds", () => {
    assert.equal(computeListSelectionIndex(2, 1, 5), 3);
  });

  test("clamp at end", () => {
    assert.equal(computeListSelectionIndex(4, 1, 5), 4);
  });

  test("clamp at start", () => {
    assert.equal(computeListSelectionIndex(0, -1, 5), 0);
  });

  test("empty list → -1", () => {
    assert.equal(computeListSelectionIndex(0, 1, 0), -1);
  });
});

describe("Batch D — computeGridSelectionIndex (2D nav)", () => {
  const cols = SHORTS_GRID_COLUMNS;

  test("grid uses two columns", () => {
    assert.equal(cols, 2);
  });

  test("move right in row 0", () => {
    assert.equal(computeGridSelectionIndex(0, 0, 1, 6, cols), 1);
  });

  test("move left blocked at column 0", () => {
    assert.equal(computeGridSelectionIndex(0, 0, -1, 6, cols), null);
  });

  test("move right blocked at last column", () => {
    assert.equal(computeGridSelectionIndex(1, 0, 1, 6, cols), null);
  });

  test("move down to next row", () => {
    assert.equal(computeGridSelectionIndex(0, 1, 0, 6, cols), 2);
  });

  test("move up blocked from row 0", () => {
    assert.equal(computeGridSelectionIndex(0, -1, 0, 6, cols), null);
  });

  test("move down blocked past last item (odd count)", () => {
    assert.equal(computeGridSelectionIndex(4, 1, 0, 5, cols), null);
  });

  test("move down to last item in odd grid from left column", () => {
    assert.equal(computeGridSelectionIndex(2, 1, 0, 5, cols), 4);
  });

  test("3-column override", () => {
    assert.equal(computeGridSelectionIndex(0, 0, 2, 9, 3), 2);
  });
});

describe("Batch D — grid layout matrix (5 items, 2 cols)", () => {
  const count = 5;

  test("from 4 down blocked", () => {
    assert.equal(computeGridSelectionIndex(4, 1, 0, count), null);
  });

  test("from 3 right blocked", () => {
    assert.equal(computeGridSelectionIndex(3, 0, 1, count), null);
  });

  test("from 2 up to 0", () => {
    assert.equal(computeGridSelectionIndex(2, -1, 0, count), 0);
  });

  test("from 1 left to 0", () => {
    assert.equal(computeGridSelectionIndex(1, 0, -1, count), 0);
  });
});
