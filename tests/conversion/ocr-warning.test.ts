import test from "node:test";
import assert from "node:assert/strict";

import { extractOcrTokens } from "../../lib/extractors/ocr";

test("extractOcrTokens summarizes empty-page warnings", () => {
  const output = extractOcrTokens(
    {
      pageCount: 3,
      pages: [
        { page: 1, text: "", lineCount: 0, charCount: 0 },
        { page: 2, text: "", lineCount: 0, charCount: 0 },
        { page: 3, text: "", lineCount: 0, charCount: 0 },
      ],
    },
    new Set([1, 2, 3]),
  );

  assert.equal(output.warnings.some((warning) => warning.code === "OCR_PAGE_EMPTY"), false);
  assert.equal(
    output.warnings.some((warning) => warning.code === "OCR_PAGES_EMPTY_SUMMARY"),
    true,
  );
});
