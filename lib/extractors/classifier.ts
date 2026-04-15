import type { ParsedPdfDocument } from "@/lib/extractors/shared";

export type PageMode = "digital" | "scanned";
export type DocumentMode = "digital" | "scanned" | "mixed";

export interface ClassifiedPage {
  page: number;
  mode: PageMode;
  confidence: number;
}

export interface ClassificationResult {
  mode: DocumentMode;
  pages: ClassifiedPage[];
}

export function classifyDocument(parsed: ParsedPdfDocument): ClassificationResult {
  const pageModes = parsed.pages.map((page) => {
    const charsPerLine = page.lineCount > 0 ? page.charCount / page.lineCount : 0;
    const mostlyEmpty = page.charCount < 80;
    const scanLike = mostlyEmpty || charsPerLine > 220;

    return {
      page: page.page,
      mode: scanLike ? ("scanned" as const) : ("digital" as const),
      confidence: scanLike ? 0.72 : 0.89,
    };
  });

  const digitalCount = pageModes.filter((page) => page.mode === "digital").length;
  const scannedCount = pageModes.length - digitalCount;

  let mode: DocumentMode = "digital";
  if (digitalCount > 0 && scannedCount > 0) {
    mode = "mixed";
  } else if (scannedCount > 0) {
    mode = "scanned";
  }

  return { mode, pages: pageModes };
}
