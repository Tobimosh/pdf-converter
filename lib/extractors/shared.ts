import pdfParse from "pdf-parse";

export interface ParsedPdfPage {
  page: number;
  text: string;
  lineCount: number;
  charCount: number;
}

export interface ParsedPdfDocument {
  pageCount: number;
  pages: ParsedPdfPage[];
}

const pageMarkerPattern = /--\s*(\d+)\s+of\s+(\d+)\s*--/g;

export function splitRawTextIntoPages(rawText: string, pageCount: number): string[] {
  const byFormFeed = rawText.split("\f");
  if (byFormFeed.length >= pageCount && byFormFeed.some((entry) => entry.trim().length > 0)) {
    return byFormFeed.slice(0, pageCount);
  }

  const markers = Array.from(rawText.matchAll(pageMarkerPattern));
  if (markers.length === 0) {
    return [rawText];
  }

  const pages = Array.from({ length: pageCount }, () => "");
  let currentPage = 1;
  let cursor = 0;

  for (const marker of markers) {
    const markerIndex = marker.index ?? cursor;
    const chunk = rawText.slice(cursor, markerIndex).trim();
    if (chunk) {
      pages[currentPage - 1] = `${pages[currentPage - 1]}\n${chunk}`.trim();
    }

    const markerPage = Number(marker[1]);
    if (Number.isFinite(markerPage) && markerPage >= 1 && markerPage < pageCount) {
      currentPage = markerPage + 1;
    }
    cursor = markerIndex + marker[0].length;
  }

  const tailChunk = rawText.slice(cursor).trim();
  if (tailChunk) {
    pages[currentPage - 1] = `${pages[currentPage - 1]}\n${tailChunk}`.trim();
  }

  return pages;
}

export async function parsePdfDocument(buffer: Buffer): Promise<ParsedPdfDocument> {
  const parsed = await pdfParse(buffer);
  const rawText = parsed.text ?? "";
  const rawPageCount = parsed.numpages ?? 1;
  const splitPages = splitRawTextIntoPages(rawText, rawPageCount);

  const pages: ParsedPdfPage[] = [];
  for (let index = 0; index < rawPageCount; index += 1) {
    const text = (splitPages[index] ?? "").trim();
    const lines = text
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean);

    pages.push({
      page: index + 1,
      text,
      lineCount: lines.length,
      charCount: text.length,
    });
  }

  return {
    pageCount: rawPageCount,
    pages,
  };
}
