import type {
  ConversionWarning,
  ExtractionToken,
  ReconstructedTable,
  TableCell,
  TableMerge,
} from "@/lib/pipeline/types";

const datePattern = /^\d{1,4}[-/]\d{1,2}[-/]\d{1,4}$/;
const numericPattern = /^-?\d{1,3}(,\d{3})*(\.\d+)?$/;
const headerColumns = [
  "Date",
  "Reference",
  "Description",
  "ValueDate",
  "Deposit",
  "Withdrawal",
  "Balance",
];

function parseValue(raw: string): Pick<TableCell, "value" | "valueType"> {
  const normalized = raw.trim();
  if (numericPattern.test(normalized)) {
    const asNumber = Number(normalized.replace(/,/g, ""));
    if (!Number.isNaN(asNumber)) {
      return { value: asNumber, valueType: "number" };
    }
  }
  if (datePattern.test(normalized)) {
    return { value: normalized, valueType: "date" };
  }
  return { value: normalized, valueType: "string" };
}

function splitRow(input: string): string[] {
  if (input.includes("|")) {
    return input
      .split("|")
      .map((chunk) => chunk.trim())
      .filter(Boolean);
  }
  if (input.includes("\t")) {
    return input
      .split("\t")
      .map((chunk) => chunk.trim())
      .filter(Boolean);
  }
  if (/\s{2,}/.test(input)) {
    return input
      .split(/\s{2,}/)
      .map((chunk) => chunk.trim())
      .filter(Boolean);
  }
  if (input.includes(",")) {
    return input
      .split(",")
      .map((chunk) => chunk.trim())
      .filter(Boolean);
  }
  return [input.trim()].filter(Boolean);
}

function toNumber(raw: string): number {
  return Number(raw.replace(/,/g, ""));
}

function sanitizeStatementLine(input: string): string {
  return input.replace(/\u0000/g, "").replace(/\s+/g, " ").trim();
}

function isPageNoise(line: string): boolean {
  if (!line) {
    return true;
  }
  if (/^--\s*\d+\s+of\s+\d+\s*--$/i.test(line)) {
    return true;
  }
  if (/^\d{1,2}\/\d{1,2}\/\d{2,4},\s*\d{1,2}:\d{2}\s*[AP]M$/i.test(line)) {
    return true;
  }
  if (/^(Cr|Dr)$/i.test(line)) {
    return true;
  }
  return false;
}

function parseOpeningBalance(line: string) {
  const balanceMatch = line.match(/Opening Balance:\s*([0-9,]+\.\d{2})/i);
  if (!balanceMatch) {
    return null;
  }
  return {
    date: "",
    reference: "",
    description: "Opening Balance",
    valueDate: "",
    deposit: "",
    withdrawal: "",
    balance: balanceMatch[1],
  };
}

type StatementRow = {
  date: string;
  reference: string;
  description: string;
  valueDate: string;
  deposit: string;
  withdrawal: string;
  balance: string;
};

function parseStatementBlock(block: string, previousBalance: number | null): StatementRow | null {
  const compact = block.replace(/\u0000/g, "").replace(/\s+/g, " ").trim();
  if (!compact) {
    return null;
  }

  const dateMatch = compact.match(/^(\d{2}-[A-Za-z]{3}-\d{4})\s*/);
  if (!dateMatch) {
    return null;
  }
  const date = dateMatch[1];
  let rest = compact.slice(dateMatch[0].length).trim();
  const footerIndex = rest.search(
    /\b(Closing Balance:|For enquiries|Adhoc Customer Statement|Statement printed)\b/i,
  );
  if (footerIndex >= 0) {
    rest = rest.slice(0, footerIndex).trim();
  }

  const balanceMatch = rest.match(/([0-9,]+\.\d{2})(?:\s*(?:Cr|Dr|C|D))?\s*$/i);
  if (!balanceMatch) {
    return null;
  }
  const balance = balanceMatch[1];
  rest = rest.slice(0, balanceMatch.index).trim();

  const valueDateMatches = [...rest.matchAll(/\d{2}-[A-Za-z]{3}-\d{4}/g)];
  let valueDate = "";
  if (valueDateMatches.length > 0) {
    const last = valueDateMatches[valueDateMatches.length - 1];
    valueDate = last[0];
    rest = `${rest.slice(0, last.index).trim()} ${rest
      .slice((last.index ?? 0) + last[0].length)
      .trim()}`.trim();
  }

  const amountMatches = [...rest.matchAll(/\b\d{1,3}(?:,\d{3})*(?:\.\d{2})\b/g)];
  const txnAmount = amountMatches.length > 0 ? amountMatches[amountMatches.length - 1][0] : "";
  if (txnAmount) {
    const idx = rest.lastIndexOf(txnAmount);
    rest = `${rest.slice(0, idx).trim()} ${rest.slice(idx + txnAmount.length).trim()}`.trim();
  }

  const parts = rest.split(" ").filter(Boolean);
  const referenceParts: string[] = [];
  let pointer = 0;

  while (pointer < parts.length) {
    const part = parts[pointer];
    if (part.includes("/")) {
      break;
    }
    if (/[A-Za-z]/.test(part) && !/[/:*]/.test(part)) {
      break;
    }
    referenceParts.push(part);
    pointer += 1;
    if (referenceParts.length >= 2) {
      break;
    }
  }

  const reference = referenceParts.join(" ").trim();
  const description = parts.slice(pointer).join(" ").trim();

  let deposit = "";
  let withdrawal = "";
  if (txnAmount) {
    const amountValue = toNumber(txnAmount);
    const balanceValue = toNumber(balance);

    if (previousBalance !== null) {
      const delta = balanceValue - previousBalance;
      const depositDistance = Math.abs(delta - amountValue);
      const withdrawalDistance = Math.abs(delta + amountValue);
      if (depositDistance <= withdrawalDistance) {
        deposit = txnAmount;
      } else {
        withdrawal = txnAmount;
      }
    } else if (/\b(FRM|FROM|PAYMENT|REVERSAL|CREDIT)\b/i.test(description)) {
      deposit = txnAmount;
    } else {
      withdrawal = txnAmount;
    }
  }

  return {
    date,
    reference,
    description,
    valueDate,
    deposit,
    withdrawal,
    balance,
  };
}

export function reconstructBankStatementRows(lines: string[]): StatementRow[] {
  const rows: StatementRow[] = [];
  const cleanLines: string[] = [];

  for (const sourceLine of lines) {
    const line = sanitizeStatementLine(sourceLine);
    if (!line) {
      continue;
    }
    if (/^[rR]$/.test(line) && cleanLines.length > 0) {
      cleanLines[cleanLines.length - 1] = `${cleanLines[cleanLines.length - 1]}r`;
      continue;
    }
    cleanLines.push(line);
  }

  const filteredLines = cleanLines.filter((line) => !isPageNoise(line));

  let currentBlock = "";
  let previousBalance: number | null = null;

  const flushBlock = () => {
    if (!currentBlock) {
      return;
    }
    const parsed = parseStatementBlock(currentBlock, previousBalance);
    if (parsed) {
      rows.push(parsed);
      previousBalance = toNumber(parsed.balance);
    }
    currentBlock = "";
  };

  for (const line of filteredLines) {
    const opening = parseOpeningBalance(line);
    if (opening) {
      rows.push(opening);
      previousBalance = toNumber(opening.balance);
      continue;
    }

    if (/^Date\s+Reference\s+Description\s+ValueDate\s+Deposit\s+Withdrawal\s+Balance/i.test(line)) {
      continue;
    }
    if (/^(ACCOUNT STATEMENT|SUMMARY DETAILS|PRIVATE AND CONFIDENTIAL)$/i.test(line)) {
      continue;
    }

    const startsTransaction = /^(\d{2}-[A-Za-z]{3}-\d{4})/.test(line);
    if (startsTransaction) {
      flushBlock();
      currentBlock = line;
      continue;
    }

    if (currentBlock) {
      currentBlock = `${currentBlock} ${line}`.trim();
    }
  }

  flushBlock();
  return rows;
}

function buildBankStatementTable(tokens: ExtractionToken[]): ReconstructedTable | null {
  const orderedLines = [...tokens]
    .sort((a, b) => a.page - b.page || a.y - b.y || a.x - b.x)
    .map((token) => token.text);
  const rows = reconstructBankStatementRows(orderedLines);
  if (rows.length === 0) {
    return null;
  }

  const cells: TableCell[] = [];
  const addRow = (values: string[], rowIndex: number) => {
    values.forEach((value, col) => {
      const parsed = parseValue(value);
      cells.push({
        row: rowIndex,
        col,
        value: parsed.value,
        displayValue: value,
        valueType: parsed.valueType,
        confidence: 0.93,
      });
    });
  };

  addRow(headerColumns, 0);
  rows.forEach((row, index) => {
    addRow(
      [
        row.date,
        row.reference,
        row.description,
        row.valueDate,
        row.deposit,
        row.withdrawal,
        `${row.balance}${row.description === "Opening Balance" ? " Cr" : ""}`.trim(),
      ],
      index + 1,
    );
  });

  return {
    id: "bank-statement-table",
    name: "Transactions",
    page: 1,
    confidence: 0.93,
    cells,
    merges: [],
  };
}

function buildGenericPageTables(tokens: ExtractionToken[]): ReconstructedTable[] {
  const byPage = new Map<number, ExtractionToken[]>();
  for (const token of tokens) {
    const list = byPage.get(token.page) ?? [];
    list.push(token);
    byPage.set(token.page, list);
  }

  const tables: ReconstructedTable[] = [];
  for (const [page, pageTokens] of byPage.entries()) {
    const sorted = [...pageTokens].sort((a, b) => a.y - b.y || a.x - b.x);
    const rows = sorted.map((token) => splitRow(token.text)).filter((row) => row.length > 0);
    if (rows.length === 0) {
      continue;
    }

    const columnCount = Math.max(...rows.map((row) => row.length));
    const cells: TableCell[] = [];
    let confidenceTotal = 0;

    rows.forEach((row, rowIndex) => {
      row.forEach((rawValue, colIndex) => {
        const parsed = parseValue(rawValue);
        const cellConfidence = pageTokens[rowIndex]?.confidence ?? 0.8;
        confidenceTotal += cellConfidence;
        cells.push({
          row: rowIndex,
          col: colIndex,
          value: parsed.value,
          displayValue: rawValue,
          valueType: parsed.valueType,
          confidence: cellConfidence,
        });
      });
    });

    const merges: TableMerge[] = [];
    if (rows[0]?.length === 1 && columnCount > 1) {
      merges.push({
        startRow: 0,
        startCol: 0,
        endRow: 0,
        endCol: columnCount - 1,
      });
    }

    const tableConfidence = cells.length > 0 ? confidenceTotal / cells.length : 0.5;
    tables.push({
      id: `page-${page}-table-1`,
      name: `Page ${page}`,
      page,
      confidence: Number(tableConfidence.toFixed(3)),
      cells,
      merges,
    });
  }

  return tables;
}

export function reconstructTables(
  tokens: ExtractionToken[],
): { tables: ReconstructedTable[]; warnings: ConversionWarning[] } {
  const warnings: ConversionWarning[] = [];
  const statementTable = buildBankStatementTable(tokens);
  const tables = statementTable ? [statementTable] : buildGenericPageTables(tokens);

  if (tables.length === 0) {
    warnings.push({
      code: "NO_TABLES_RECONSTRUCTED",
      message: "No table-like structures could be reconstructed.",
      scope: "table_reconstruction",
      confidence: 0.2,
    });
  }

  return { tables, warnings };
}
