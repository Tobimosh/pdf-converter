import type { ConversionWarning, ExtractionToken } from "@/lib/pipeline/types";
import type { ParsedPdfDocument } from "@/lib/extractors/shared";

export interface OcrExtractorOutput {
  tokens: ExtractionToken[];
  warnings: ConversionWarning[];
}

function normalizeOcrLine(value: string) {
  return value
    .replace(/[|]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function extractOcrTokens(
  parsed: ParsedPdfDocument,
  allowedPages: Set<number>,
): OcrExtractorOutput {
  const tokens: ExtractionToken[] = [];
  const warnings: ConversionWarning[] = [];
  const emptyPages: number[] = [];

  for (const page of parsed.pages) {
    if (!allowedPages.has(page.page)) {
      continue;
    }

    const lines = page.text
      .split(/\r?\n/)
      .map((line) => normalizeOcrLine(line))
      .filter(Boolean);

    if (lines.length === 0) {
      emptyPages.push(page.page);
      continue;
    }

    lines.forEach((line, lineIndex) => {
      tokens.push({
        text: line,
        page: page.page,
        x: 0,
        y: lineIndex * 14,
        width: line.length * 7,
        height: 12,
        confidence: 0.7,
        source: "ocr",
      });
    });
  }

  if (emptyPages.length > 0) {
    const preview = emptyPages.slice(0, 8).join(", ");
    const suffix = emptyPages.length > 8 ? ", ..." : "";
    warnings.push({
      code: "OCR_PAGES_EMPTY_SUMMARY",
      message: `OCR fallback produced no text on ${emptyPages.length} scanned pages (${preview}${suffix}).`,
      scope: "ocr_extractor",
      confidence: 0.25,
    });
  }

  if (allowedPages.size > 0) {
    warnings.push({
      code: "OCR_FALLBACK_MODE",
      message:
        "OCR path currently uses text-layer fallback. Plug a dedicated OCR engine for production scanned-PDF accuracy.",
      scope: "ocr_extractor",
      confidence: 0.55,
    });
  }

  return { tokens, warnings };
}
