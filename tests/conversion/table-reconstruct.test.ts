import test from "node:test";
import assert from "node:assert/strict";

import { reconstructTables } from "../../lib/table/reconstruct";

test("reconstructTables creates typed cells and header merge", () => {
  const { tables } = reconstructTables([
    {
      text: "Revenue Report",
      page: 1,
      x: 0,
      y: 0,
      width: 100,
      height: 10,
      confidence: 0.9,
      source: "digital",
    },
    {
      text: "Month  Amount  Date",
      page: 1,
      x: 0,
      y: 14,
      width: 100,
      height: 10,
      confidence: 0.95,
      source: "digital",
    },
    {
      text: "Jan  1,250.00  2026-01-31",
      page: 1,
      x: 0,
      y: 28,
      width: 100,
      height: 10,
      confidence: 0.95,
      source: "digital",
    },
  ]);

  assert.equal(tables.length, 1);
  assert.equal(tables[0].merges.length, 1);

  const numericCell = tables[0].cells.find((cell) => cell.displayValue === "1,250.00");
  assert.equal(numericCell?.valueType, "number");
  assert.equal(numericCell?.value, 1250);

  const dateCell = tables[0].cells.find((cell) => cell.displayValue === "2026-01-31");
  assert.equal(dateCell?.valueType, "date");
});
