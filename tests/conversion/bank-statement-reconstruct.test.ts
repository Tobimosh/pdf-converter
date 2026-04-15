import test from "node:test";
import assert from "node:assert/strict";

import { reconstructBankStatementRows, reconstructTables } from "../../lib/table/reconstruct";
import type { ExtractionToken } from "../../lib/pipeline/types";

test("reconstructBankStatementRows parses wrapped statement lines", () => {
  const rows = reconstructBankStatementRows([
    "Date  Reference  Description  ValueDate  Deposit  Withdrawal  Balance",
    "Opening Balance: 164,615,719.24 Cr",
    "02-Jan-2025 506108*******",
    "**8489 500112003748/POS PURCHASE @ 2032T9WP-3748/506108** 01-Jan-2025 65,000.00 164,550,719.24 Cr",
    "02-Jan-2025 R-1178171594/FGN: FEDER:PaymentforPurchasingLo 02-Jan-2025 41,571,000.00 206,121,719.24 Cr",
  ]);

  assert.equal(rows.length, 3);
  assert.equal(rows[1].date, "02-Jan-2025");
  assert.match(rows[1].reference, /506108/);
  assert.match(rows[1].description, /POS PURCHASE/i);
  assert.equal(rows[1].valueDate, "01-Jan-2025");
  assert.equal(rows[1].withdrawal, "65,000.00");
  assert.equal(rows[1].balance, "164,550,719.24");
  assert.equal(rows[2].deposit, "41,571,000.00");
});

test("reconstructTables returns statement-shaped table", () => {
  const tokens: ExtractionToken[] = [
    {
      text: "Date  Reference  Description  ValueDate  Deposit  Withdrawal  Balance",
      page: 1,
      x: 0,
      y: 0,
      width: 100,
      height: 10,
      confidence: 0.95,
      source: "digital",
    },
    {
      text: "Opening Balance: 164,615,719.24 Cr",
      page: 1,
      x: 0,
      y: 1,
      width: 100,
      height: 10,
      confidence: 0.95,
      source: "digital",
    },
    {
      text: "02-Jan-2025  R-1178171594/FGN: FEDER:PaymentforPurchasingLo  02-Jan-2025  41,571,000.00  206,121,719.24 Cr",
      page: 1,
      x: 0,
      y: 2,
      width: 100,
      height: 10,
      confidence: 0.95,
      source: "digital",
    },
  ];

  const { tables } = reconstructTables(tokens);
  assert.equal(tables[0].name, "Transactions");
  const headers = tables[0].cells
    .filter((cell) => cell.row === 0)
    .sort((a, b) => a.col - b.col)
    .map((cell) => String(cell.value));
  assert.deepEqual(headers, [
    "Date",
    "Reference",
    "Description",
    "ValueDate",
    "Deposit",
    "Withdrawal",
    "Balance",
  ]);
});
