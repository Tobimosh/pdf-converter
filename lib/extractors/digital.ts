import type { ConversionWarning, ExtractionToken } from "@/lib/pipeline/types";
import type { ParsedPdfDocument } from "@/lib/extractors/shared";

export interface ExtractorOutput {
  tokens: ExtractionToken[];
  warnings: ConversionWarning[];
}

export function extractDigitalTokens(
  parsed: ParsedPdfDocument,
  allowedPages: Set<number>,
): ExtractorOutput {
  const tokens: ExtractionToken[] = [];

  for (const page of parsed.pages) {
    if (!allowedPages.has(page.page)) {
      continue;
    }

    const lines = page.text
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean);

    lines.forEach((line, lineIndex) => {
      tokens.push({
        text: line,
        page: page.page,
        x: 0,
        y: lineIndex * 14,
        width: line.length * 7,
        height: 12,
        confidence: 0.96,
        source: "digital",
      });
    });
  }

  const warnings: ConversionWarning[] = [];
  if (tokens.length === 0) {
    warnings.push({
      code: "DIGITAL_TEXT_NOT_FOUND",
      message: "No digital text tokens were extracted from selected pages.",
      scope: "digital_extractor",
      confidence: 0.4,
    });
  }

  return { tokens, warnings };
}
