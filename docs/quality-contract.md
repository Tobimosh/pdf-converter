# PDF To Excel Quality Contract

This document defines the non-negotiable quality targets for the converter.

## Scope

- Input format: `.pdf` files only.
- Input type: mixed documents (digital text + scanned/image pages).
- Output format: `.xlsx`.

## Accuracy Targets

- Table boundary detection F1: `>= 0.93`.
- Cell placement accuracy: `>= 0.96`.
- Merged-cell preservation accuracy: `>= 0.95`.
- Numeric typing accuracy: `>= 0.99`.
- Date typing accuracy: `>= 0.97`.

## Operational Targets

- Maximum upload size: `20 MB`.
- Maximum pages per document: `150`.
- P95 end-to-end processing time:
  - up to 20 pages: `< 45s`
  - up to 150 pages: `< 180s`
- API status polling response time: `< 300ms` P95.

## Confidence And Fallback Rules

- Every table and cell must have a confidence score.
- Low-confidence threshold: `< 0.70`.
- Any low-confidence table must:
  - be included in output
  - be flagged in a metadata sheet
  - include warning codes in the job diagnostics payload

## Release Gate

A release is allowed only when benchmark score changes remain in allowed ranges:

- No metric may regress by more than `1.5%` absolute.
- No new high-severity parsing class failure is introduced.
- At least `95%` of benchmark fixtures must convert successfully.

## Benchmark Corpus Requirements

The benchmark corpus must include the following fixture families:

- Digital invoices (single and multi-table).
- Bank statements with merged header bands.
- Scanned forms with skew/noise.
- Dense multi-column financial reports.
- Mixed pages (digital + scanned in one file).
- Edge-case fixtures: blank pages, rotated pages, and handwritten annotations.

Fixtures and fixture metadata live under `tests/fixtures/`.
