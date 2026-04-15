import test from "node:test";
import assert from "node:assert/strict";

import { classifyDocument } from "../../lib/extractors/classifier";

test("classifyDocument marks mixed documents when pages differ", () => {
  const result = classifyDocument({
    pageCount: 2,
    pages: [
      { page: 1, text: "A lot of digital text here", lineCount: 1, charCount: 120 },
      { page: 2, text: "", lineCount: 0, charCount: 0 },
    ],
  });

  assert.equal(result.mode, "mixed");
  assert.equal(result.pages[0].mode, "digital");
  assert.equal(result.pages[1].mode, "scanned");
});
