import { appConfig } from "@/lib/config";
import { classifyDocument } from "@/lib/extractors/classifier";
import { extractDigitalTokens } from "@/lib/extractors/digital";
import { extractOcrTokens } from "@/lib/extractors/ocr";
import { parsePdfDocument } from "@/lib/extractors/shared";
import { generateWorkbookBuffer } from "@/lib/export/xlsx";
import { readInputFile, writeOutputFile } from "@/lib/jobs/store";
import { measureDuration } from "@/lib/observability/logger";
import { reconstructTables } from "@/lib/table/reconstruct";
import type { ConversionWarning, PipelineResult } from "@/lib/pipeline/types";

export async function runConversionPipeline(
  inputPath: string,
  outputPath: string,
): Promise<PipelineResult> {
  const durationsMs: Record<string, number> = {};
  const warnings: ConversionWarning[] = [];

  const parsedPdf = await measureDuration("parse_pdf_ms", durationsMs, async () => {
    const buffer = await readInputFile(inputPath);
    return parsePdfDocument(buffer);
  });

  if (parsedPdf.pageCount > appConfig.maxPages) {
    throw new Error(`PDF has ${parsedPdf.pageCount} pages. Maximum allowed is ${appConfig.maxPages}.`);
  }

  const classification = await measureDuration("classify_pages_ms", durationsMs, async () =>
    classifyDocument(parsedPdf),
  );

  const digitalPages = new Set(
    classification.pages.filter((page) => page.mode === "digital").map((page) => page.page),
  );
  const scannedPages = new Set(
    classification.pages.filter((page) => page.mode === "scanned").map((page) => page.page),
  );

  const digitalOutput = await measureDuration("extract_digital_ms", durationsMs, async () =>
    extractDigitalTokens(parsedPdf, digitalPages),
  );
  warnings.push(...digitalOutput.warnings);

  const ocrOutput = await measureDuration("extract_ocr_ms", durationsMs, async () =>
    extractOcrTokens(parsedPdf, scannedPages),
  );
  warnings.push(...ocrOutput.warnings);

  const extractedTokens = [...digitalOutput.tokens, ...ocrOutput.tokens];
  const reconstructed = await measureDuration("reconstruct_tables_ms", durationsMs, async () =>
    reconstructTables(extractedTokens),
  );
  warnings.push(...reconstructed.warnings);

  for (const table of reconstructed.tables) {
    if (table.confidence < appConfig.lowConfidenceThreshold) {
      warnings.push({
        code: "LOW_CONFIDENCE_TABLE",
        message: `Table ${table.id} has low confidence (${table.confidence}).`,
        scope: table.id,
        confidence: table.confidence,
      });
    }
  }

  const result: PipelineResult = {
    tables: reconstructed.tables,
    warnings,
    diagnostics: {
      durationsMs,
      lowConfidenceTableCount: reconstructed.tables.filter(
        (table) => table.confidence < appConfig.lowConfidenceThreshold,
      ).length,
      pageModes: classification.pages,
    },
  };

  await measureDuration("write_xlsx_ms", durationsMs, async () => {
    const workbook = generateWorkbookBuffer(result);
    await writeOutputFile(outputPath, workbook);
  });

  return result;
}
