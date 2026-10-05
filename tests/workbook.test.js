import { test } from "node:test";
import assert from "node:assert/strict";
import ExcelJS from "exceljs";

import { FILTERS, groupRegistrations } from "../web/lib/registrations.js";
import { buildWorkbook } from "../web/lib/workbook.js";
import { SAMPLE_ROWS, TODAY } from "./fixtures/sample-rows.js";

async function roundTrip(events) {
  const buffer = await buildWorkbook(ExcelJS, events).xlsx.writeBuffer();
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(buffer);
  return wb;
}

// Array.from turns ExcelJS's sparse row arrays into plain ones (holes -> undefined)
const values = (ws, row) => Array.from(ws.getRow(row).values).slice(1);

test("one sheet per event, with unique names when long names collide", async () => {
  const wb = await roundTrip(groupRegistrations(SAMPLE_ROWS, FILTERS.currentYear, TODAY));
  assert.deepEqual(
    wb.worksheets.map((ws) => ws.name),
    [
      "Fall Cub Activity Day  Family F",
      "Fall Cub Activity Day  Fami (2)",
      "2026 Spring Camporee",
      "Pinewood Derby Workshop",
    ],
  );
});

test("booked and not-booked sections match scraper.py's layout", async () => {
  const wb = await roundTrip(groupRegistrations(SAMPLE_ROWS, FILTERS.currentYear, TODAY));
  const ws = wb.worksheets[0];

  assert.equal(ws.getCell("A1").value, "Event: Fall Cub Activity Day & Family Fun Weekend 2026 - Fall Cub Activity Day");
  assert.deepEqual(values(ws, 3), ["Booked On", "Contact Name", "Email", "Participants", "Registration Number"]);
  assert.deepEqual(values(ws, 4), ["Oct 03, 2026 at 09:57 AM", "Pat Example", "pat@example.com", 2, 6405450292]);
  assert.deepEqual(values(ws, 6), ["TOTAL:", undefined, undefined, 6]);

  assert.equal(ws.getCell("A9").value, "NOT BOOKED REGISTRATIONS:");
  assert.deepEqual(values(ws, 10), ["Contact Name", "Email", "Participants", "Registration Number", "Started On"]);
  assert.deepEqual(values(ws, 11), ["Lee Placeholder", "lee@example.com", 3, 6405400002, "Sep 21, 2026 at 07:15 PM"]);
  assert.deepEqual(values(ws, 12), ["NOT BOOKED TOTAL:", undefined, 3]);

  const tables = Object.values(ws.tables).map((t) => [t.table.name, t.table.tableRef, t.table.style.theme]);
  assert.deepEqual(tables, [
    ["FallCubActivityBooked1", "A3:E5", "TableStyleMedium9"],
    ["FallCubActivityNotBooked1", "A10:E11", "TableStyleMedium2"],
  ]);
  assert.equal(ws.getColumn(1).width, 20);
});

test("not-booked-only events start their section at row 5", async () => {
  const wb = await roundTrip(groupRegistrations(SAMPLE_ROWS, FILTERS.currentYear, TODAY));
  const ws = wb.getWorksheet("Pinewood Derby Workshop");
  assert.equal(ws.getCell("A5").value, "NOT BOOKED REGISTRATIONS:");
  assert.deepEqual(values(ws, 8), ["NOT BOOKED TOTAL:", undefined, 0]);
});

test("table names are valid when the sheet name starts with a digit", async () => {
  const wb = await roundTrip(groupRegistrations(SAMPLE_ROWS, FILTERS.currentYear, TODAY));
  const names = Object.keys(wb.getWorksheet("2026 Spring Camporee").tables);
  assert.deepEqual(names, ["T2026SpringCampoBooked3"]);
});
