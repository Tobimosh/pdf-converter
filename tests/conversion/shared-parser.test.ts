import test from "node:test";
import assert from "node:assert/strict";

import { splitRawTextIntoPages } from "../../lib/extractors/shared";

test("splitRawTextIntoPages falls back to statement page markers", () => {
  const sample = [
    "Header page 1",
    "Txn line 1",
    "-- 1 of 3 --",
    "Header page 2",
    "Txn line 2",
    "-- 2 of 3 --",
    "Header page 3",
    "Txn line 3",
  ].join("\n");

  const pages = splitRawTextIntoPages(sample, 3);
  assert.equal(pages.length, 3);
  assert.match(pages[0], /Txn line 1/);
  assert.match(pages[1], /Txn line 2/);
  assert.match(pages[2], /Txn line 3/);
});
