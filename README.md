# PDF To Excel Converter

High-accuracy conversion foundation for mixed PDFs (digital + scanned) into `.xlsx`.

## Architecture

- `app/api/convert/route.ts`: upload endpoint and job creation.
- `app/api/jobs/[id]/route.ts`: job status endpoint with diagnostics/warnings.
- `app/api/jobs/[id]/download/route.ts`: generated workbook download endpoint.
- `lib/jobs/*`: file-backed job store + queue trigger.
- `lib/pipeline/*`: extraction, classification, table reconstruction, and export flow.
- `tests/conversion/*`: stage-level regression tests.

## Quick Start

```bash
pnpm install
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000), upload a PDF, and wait for conversion completion.

## Quality Contract

Targets and release gates are defined in `docs/quality-contract.md`.

## Environment Variables

Optional settings:

- `DATA_DIR` (default: `.data`)
- `MAX_UPLOAD_MB` (default: `20`)
- `MAX_PAGES` (default: `150`)
- `LOW_CONFIDENCE_THRESHOLD` (default: `0.7`)
- `JOB_RETENTION_HOURS` (default: `24`)
- `RATE_LIMIT_WINDOW_MS` (default: `60000`)
- `RATE_LIMIT_MAX_REQUESTS` (default: `12`)

## Testing

```bash
pnpm test
pnpm lint
```
