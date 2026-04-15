import test from "node:test";
import assert from "node:assert/strict";
import * as XLSX from "xlsx";

import { generateWorkbookBuffer } from "../../lib/export/xlsx";
import type { PipelineResult } from "../../lib/pipeline/types";

test("generateWorkbookBuffer writes tables and metadata sheet", () => {
  const result: PipelineResult = {
    tables: [
      {
        id: "table-1",
        name: "Table One",
        page: 1,
        confidence: 0.95,
        cells: [
          {
            row: 0,
            col: 0,
            value: "Item",
            displayValue: "Item",
            valueType: "string",
            confidence: 0.95,
          },
          {
            row: 0,
            col: 1,
            value: 42,
            displayValue: "42",
            valueType: "number",
            confidence: 0.95,
          },
        ],
        merges: [],
      },
    ],
    warnings: [
      {
        code: "LOW_CONFIDENCE_TABLE",
        message: "Example warning",
        scope: "table-2",
        confidence: 0.5,
      },
    ],
    diagnostics: {
      durationsMs: {
        parse_pdf_ms: 20,
      },
      lowConfidenceTableCount: 1,
      pageModes: [],
    },
  };

  const workbookBuffer = generateWorkbookBuffer(result);
  const workbook = XLSX.read(workbookBuffer, { type: "buffer" });

  assert.ok(workbook.SheetNames.includes("Table One"));
  assert.ok(workbook.SheetNames.includes("metadata"));
});
