import * as XLSX from "xlsx";

import type { PipelineResult } from "@/lib/pipeline/types";

function buildAoA(resultTable: PipelineResult["tables"][number]) {
  const maxRow = Math.max(...resultTable.cells.map((cell) => cell.row), 0);
  const maxCol = Math.max(...resultTable.cells.map((cell) => cell.col), 0);
  const aoa: Array<Array<string | number>> = Array.from({ length: maxRow + 1 }, () =>
    Array.from({ length: maxCol + 1 }, () => ""),
  );

  for (const cell of resultTable.cells) {
    aoa[cell.row][cell.col] = cell.value;
  }

  return aoa;
}

export function generateWorkbookBuffer(result: PipelineResult): Buffer {
  const wb = XLSX.utils.book_new();

  for (const table of result.tables) {
    const sheet = XLSX.utils.aoa_to_sheet(buildAoA(table));
    sheet["!merges"] = table.merges.map((merge) => ({
      s: { r: merge.startRow, c: merge.startCol },
      e: { r: merge.endRow, c: merge.endCol },
    }));
    XLSX.utils.book_append_sheet(wb, sheet, table.name.slice(0, 31));
  }

  const metadataRows: Array<Array<string | number>> = [
    ["warning_code", "message", "scope", "confidence"],
    ...result.warnings.map((warning) => [
      warning.code,
      warning.message,
      warning.scope ?? "",
      warning.confidence ?? "",
    ]),
    [],
    ["diagnostic_key", "value"],
    ...Object.entries(result.diagnostics.durationsMs).map(([key, value]) => [key, value]),
    ["low_confidence_table_count", result.diagnostics.lowConfidenceTableCount],
  ];

  const metadataSheet = XLSX.utils.aoa_to_sheet(metadataRows);
  XLSX.utils.book_append_sheet(wb, metadataSheet, "metadata");

  return XLSX.write(wb, {
    type: "buffer",
    bookType: "xlsx",
    compression: true,
  }) as Buffer;
}
