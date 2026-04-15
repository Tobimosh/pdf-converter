# PDF To Excel Converter

PDF to Excel conversion app focused on extracting structured financial tables from multi-page statements and exporting them into clean `.xlsx` files.

The pipeline supports:

- PDF upload and asynchronous conversion jobs
- page-aware text extraction with statement-specific parsing
- transaction-table reconstruction into fixed spreadsheet columns
- downloadable Excel output with metadata and warnings

## Live Site

- [PDF Converter (Production)](https://pdf-converter-dev.vercel.app/)

## What This Project Does

Given a PDF statement, the app attempts to reconstruct tabular data into:

`Date | Reference | Description | ValueDate | Deposit | Withdrawal | Balance`

Key behavior includes:

- handling wrapped statement rows across multiple lines
- handling glued date/value text patterns common in exported bank PDFs
- preserving typed numeric/date values in Excel
- including pipeline warnings and diagnostics in a metadata sheet

## Architecture Overview

- `app/page.tsx`: upload, job status polling, warnings, and download UI.
- `app/api/convert/route.ts`: upload endpoint and conversion job creation.
- `app/api/jobs/[id]/route.ts`: job status endpoint.
- `app/api/jobs/[id]/download/route.ts`: generated `.xlsx` download endpoint.
- `lib/pipeline/*`: end-to-end conversion orchestration.
- `lib/extractors/*`: PDF parsing, page splitting, classification, OCR fallback path.
- `lib/table/reconstruct.ts`: statement-aware row parsing and table reconstruction.
- `lib/export/xlsx.ts`: workbook generation.
- `lib/jobs/*`: local file-backed storage and async queue execution.

## Local Development

```bash
pnpm install
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000), upload a PDF, and wait for status to reach `succeeded`.

## Quality Contract

Acceptance metrics and release thresholds are documented in `docs/quality-contract.md`.

## Configuration

Optional environment variables:

- `DATA_DIR` (default: `.data`)
- `MAX_UPLOAD_MB` (default: `20`)
- `MAX_PAGES` (default: `150`)
- `LOW_CONFIDENCE_THRESHOLD` (default: `0.7`)
- `JOB_RETENTION_HOURS` (default: `24`)
- `RATE_LIMIT_WINDOW_MS` (default: `60000`)
- `RATE_LIMIT_MAX_REQUESTS` (default: `12`)

## Tests and Validation

```bash
pnpm test
pnpm lint
pnpm build
```
