// Builds the Excel workbook from groupRegistrations() output. Mirrors
// write_to_excel() in scraper.py: one sheet per event, a booked table, a
// not-booked table for follow-up, and participant totals under each.
//
// ExcelJS is passed in so the same code runs in the browser (global from
// vendor/exceljs.min.js) and in Node tests (the npm package).
import { totalParticipants } from "./registrations.js";

const SHEET_NAME_MAX = 31;
const FIRST_COLUMN_WIDTH = 20;

function sheetNameFor(event, used) {
  const cleaned = event.replace(/[^A-Za-z0-9 _-]/g, "").trim() || "Event";
  let name = cleaned.slice(0, SHEET_NAME_MAX).trim();
  // Excel sheet names are unique case-insensitively; long event names that
  // share a prefix would otherwise collide once truncated.
  for (let n = 2; used.has(name.toLowerCase()); n++) {
    const suffix = ` (${n})`;
    name = cleaned.slice(0, SHEET_NAME_MAX - suffix.length).trim() + suffix;
  }
  used.add(name.toLowerCase());
  return name;
}

function tableBaseName(sheetName) {
  const base = sheetName.replace(/[^A-Za-z0-9]/g, "").slice(0, 15) || "Event";
  // Excel table names must start with a letter or underscore
  return /^[A-Za-z_]/.test(base) ? base : `T${base}`;
}

function columnsFor(records) {
  const keys = [...new Set(records.flatMap((r) => Object.keys(r)))].sort();
  // Put Registration Number right after Participants
  if (keys.includes("Participants") && keys.includes("Registration Number")) {
    keys.splice(keys.indexOf("Registration Number"), 1);
    keys.splice(keys.indexOf("Participants") + 1, 0, "Registration Number");
  }
  return keys;
}

function rowValues(record, keys) {
  return keys.map((key) => {
    const value = record[key];
    if ((key === "Participants" || key === "Registration Number") && typeof value === "number") {
      return Math.trunc(value);
    }
    return value === undefined || value === null ? "" : String(value);
  });
}

// Writes a table at startRow (header row) followed by a total row when there
// is a Participants column. Returns the first row after what it wrote.
function writeSection(ws, { startRow, records, tableName, theme, totalLabel }) {
  const keys = columnsFor(records);
  ws.addTable({
    name: tableName,
    ref: `A${startRow}`,
    headerRow: true,
    totalsRow: false,
    style: {
      theme,
      showFirstColumn: false,
      showLastColumn: false,
      showRowStripes: true,
      showColumnStripes: false,
    },
    columns: keys.map((name) => ({ name, filterButton: true })),
    rows: records.map((r) => rowValues(r, keys)),
  });

  let nextRow = startRow + 1 + records.length;
  if (keys.includes("Participants")) {
    const totals = keys.map(() => null);
    totals[0] = totalLabel;
    totals[keys.indexOf("Participants")] = totalParticipants(records);
    ws.getRow(nextRow).values = totals;
    nextRow += 1;
  }
  return nextRow;
}

function autoFitColumns(ws) {
  ws.columns.forEach((column) => {
    let max = 0;
    column.eachCell({ includeEmpty: false }, (cell) => {
      max = Math.max(max, String(cell.value ?? "").length);
    });
    column.width = max + 2;
  });
  ws.getColumn(1).width = FIRST_COLUMN_WIDTH;
}

export function buildWorkbook(ExcelJS, events) {
  const wb = new ExcelJS.Workbook();
  wb.creator = "Black Pug Registrant Export";
  wb.created = new Date();

  const usedSheetNames = new Set();
  const usedTableNames = new Set();
  const uniqueTableName = (name) => {
    let candidate = name;
    for (let n = 1; usedTableNames.has(candidate.toLowerCase()); n++) candidate = `${name}_${n}`;
    usedTableNames.add(candidate.toLowerCase());
    return candidate;
  };

  events.forEach((event, i) => {
    const sheetName = sheetNameFor(event.name, usedSheetNames);
    const ws = wb.addWorksheet(sheetName);
    const base = tableBaseName(sheetName);

    ws.getCell("A1").value = `Event: ${event.name}`;
    let row = 3;

    if (event.booked.length) {
      row = writeSection(ws, {
        startRow: row,
        records: event.booked,
        tableName: uniqueTableName(`${base}Booked${i + 1}`),
        theme: "TableStyleMedium9",
        totalLabel: "TOTAL:",
      });
    }

    if (event.notBooked.length) {
      row += 2;
      ws.getCell(`A${row}`).value = "NOT BOOKED REGISTRATIONS:";
      row = writeSection(ws, {
        startRow: row + 1,
        records: event.notBooked,
        tableName: uniqueTableName(`${base}NotBooked${i + 1}`),
        theme: "TableStyleMedium2",
        totalLabel: "NOT BOOKED TOTAL:",
      });
    }

    autoFitColumns(ws);
  });

  return wb;
}
