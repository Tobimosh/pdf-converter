export type JobStatus = "queued" | "processing" | "succeeded" | "failed";

export type CellValueType = "string" | "number" | "date";

export interface ConversionWarning {
  code: string;
  message: string;
  scope?: string;
  confidence?: number;
}

export interface ExtractionToken {
  text: string;
  page: number;
  x: number;
  y: number;
  width: number;
  height: number;
  confidence: number;
  source: "digital" | "ocr";
}

export interface ExtractedDocument {
  mode: "digital" | "scanned" | "mixed";
  pageCount: number;
  tokens: ExtractionToken[];
  warnings: ConversionWarning[];
}

export interface TableCell {
  row: number;
  col: number;
  value: string | number;
  displayValue: string;
  valueType: CellValueType;
  confidence: number;
}

export interface TableMerge {
  startRow: number;
  startCol: number;
  endRow: number;
  endCol: number;
}

export interface ReconstructedTable {
  id: string;
  name: string;
  page: number;
  confidence: number;
  cells: TableCell[];
  merges: TableMerge[];
}

export interface PipelineDiagnostics {
  durationsMs: Record<string, number>;
  lowConfidenceTableCount: number;
  pageModes: Array<{
    page: number;
    mode: "digital" | "scanned";
    confidence: number;
  }>;
}

export interface PipelineResult {
  tables: ReconstructedTable[];
  warnings: ConversionWarning[];
  diagnostics: PipelineDiagnostics;
}

export interface ConversionJobRecord {
  id: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  createdAt: string;
  updatedAt: string;
  status: JobStatus;
  statusMessage: string;
  inputPath: string;
  outputPath?: string;
  errorMessage?: string;
  warnings: ConversionWarning[];
  diagnostics?: PipelineDiagnostics;
}
