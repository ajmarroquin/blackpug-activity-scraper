import { BOOKMARKLET_FUNCTION } from "./bookmarklet-source.js";
import { FILTERS, groupRegistrations, totalParticipants } from "./lib/registrations.js";
import { buildWorkbook } from "./lib/workbook.js";

const MESSAGE = "blackpug-export";
const XLSX_TYPE = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

const $ = (id) => document.getElementById(id);

function showLanding() {
  const link = $("bookmarklet");
  // The folder this page is served from: "/" on Vercel or locally,
  // "/blackpug-activity-scraper/" on GitHub Pages
  const appUrl = new URL("./", location.href).href;
  // A javascript: URL must evaluate to undefined, or the browser replaces the
  // page with the result. Hence the void.
  const code = `void (${BOOKMARKLET_FUNCTION})(${JSON.stringify(appUrl)},${JSON.stringify(location.origin)})`;
  link.href = `javascript:${encodeURIComponent(code)}`;
  link.addEventListener("click", (event) => {
    event.preventDefault();
    $("bookmarklet-hint").hidden = false;
  });
}

// ---- Export view (opened by the bookmark) ----

let rawRows = [];

function loadExcelJS() {
  return new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = "vendor/exceljs.min.js";
    script.onload = () =>
      window.ExcelJS ? resolve(window.ExcelJS) : reject(new Error("The spreadsheet library didn't load."));
    script.onerror = () => reject(new Error("The spreadsheet library didn't load. Check your connection and try again."));
    document.head.append(script);
  });
}

function showError(message) {
  $("export-body").hidden = true;
  $("status").textContent = "Something went wrong.";
  const error = $("error");
  error.textContent = message;
  error.hidden = false;
}

// Only accept the shape the bookmarklet sends: [{ title, fields: [[label, value]] }]
function validRows(rows) {
  if (!Array.isArray(rows)) return null;
  const clean = [];
  for (const row of rows) {
    if (!row || typeof row.title !== "string" || !Array.isArray(row.fields)) return null;
    const fields = row.fields
      .filter((f) => Array.isArray(f) && typeof f[0] === "string" && typeof f[1] === "string")
      .map(([label, value]) => [label, value]);
    clean.push({ title: row.title, fields });
  }
  return clean;
}

function selectedFilter() {
  return document.querySelector("input[name=filter]:checked").value;
}

function countLabel(events) {
  return events.length === 1 ? "1 event" : `${events.length} events`;
}

function cell(tag, text, className) {
  const el = document.createElement(tag);
  el.textContent = text;
  if (className) el.className = className;
  return el;
}

function render() {
  const today = new Date();
  const year = today.getFullYear();
  const byFilter = Object.fromEntries(
    Object.values(FILTERS).map((f) => [f, groupRegistrations(rawRows, f, today)]),
  );
  $("future-label").textContent = `from today · ${countLabel(byFilter[FILTERS.future])}`;
  $("current-year-label").textContent = `${year} · ${countLabel(byFilter[FILTERS.currentYear])}`;
  $("last-year-label").textContent = `${year - 1} · ${countLabel(byFilter[FILTERS.lastYear])}`;

  const events = byFilter[selectedFilter()];
  const tbody = $("summary").tBodies[0];
  tbody.replaceChildren(
    ...events.map((event) => {
      const tr = document.createElement("tr");
      tr.append(
        cell("th", event.name),
        cell("td", String(event.booked.length), "num"),
        cell("td", String(totalParticipants(event.booked)), "num"),
        cell("td", String(event.notBooked.length), "num"),
      );
      tr.firstChild.scope = "row";
      return tr;
    }),
  );
  $("summary").hidden = events.length === 0;
  $("empty").hidden = events.length > 0;
  $("download").disabled = events.length === 0;

  const removed = events.flatMap((event) => event.removed.map((record) => ({ event, record })));
  $("duplicates").hidden = removed.length === 0;
  $("duplicates-summary").textContent =
    removed.length === 1
      ? "1 duplicate left off the not-booked list"
      : `${removed.length} duplicates left off the not-booked list`;
  $("duplicates-list").replaceChildren(
    ...removed.map(({ event, record }) =>
      cell("li", `${record["Contact Name"] || "Unknown"} (${record.Email || "no email"}): ${event.name}`),
    ),
  );
}

function fileNameFor(filter) {
  const year = new Date().getFullYear();
  const suffix = { [FILTERS.future]: "future", [FILTERS.currentYear]: year, [FILTERS.lastYear]: year - 1 }[filter];
  return `blackpug-registrants-${suffix}.xlsx`;
}

async function download(excelReady) {
  const button = $("download");
  button.disabled = true;
  button.textContent = "Building…";
  try {
    const ExcelJS = await excelReady;
    const filter = selectedFilter();
    const events = groupRegistrations(rawRows, filter);
    const buffer = await buildWorkbook(ExcelJS, events).xlsx.writeBuffer();
    const url = URL.createObjectURL(new Blob([buffer], { type: XLSX_TYPE }));
    const a = document.createElement("a");
    a.href = url;
    a.download = fileNameFor(filter);
    document.body.append(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 10000);
  } catch (err) {
    showError(err.message);
  } finally {
    button.disabled = false;
    button.textContent = "Download Excel";
  }
}

function showExport() {
  $("landing").hidden = true;
  $("export").hidden = false;
  document.title = "Your registrations · Black Pug Registrant Export";

  const opener = window.opener;
  if (!opener) {
    showError("Open this page by clicking the Export from Black Pug bookmark while you're on your Black Pug event page.");
    return;
  }

  const excelReady = loadExcelJS();
  excelReady.catch(() => {}); // surfaced when they click Download
  let received = false;

  window.addEventListener("message", (event) => {
    if (event.source !== opener || !event.data) return;
    const { type } = event.data;
    if (type === `${MESSAGE}:error`) {
      received = true;
      showError(String(event.data.message || "The bookmark couldn't read your registrations."));
    } else if (type === `${MESSAGE}:data`) {
      const rows = validRows(event.data.rows);
      if (!rows) return;
      received = true;
      rawRows = rows;
      const source = typeof event.data.source === "string" ? ` from ${event.data.source}` : "";
      $("status").textContent = `Got ${rows.length} registration${rows.length === 1 ? "" : "s"}${source}. Pick a date range, then download.`;
      $("error").hidden = true;
      $("export-body").hidden = false;
      render();
    }
  });

  for (const input of document.querySelectorAll("input[name=filter]")) {
    input.addEventListener("change", render);
  }
  $("download").addEventListener("click", () => download(excelReady));

  // No data in this message, so it's fine for any opener to see it
  opener.postMessage({ type: `${MESSAGE}:ready` }, "*");
  setTimeout(() => {
    if (!received) {
      $("status").textContent =
        "Still working. If nothing shows up soon, go back to your Black Pug tab and click the bookmark again.";
    }
  }, 30000);
}

if (new URLSearchParams(location.search).has("receive")) {
  showExport();
} else {
  showLanding();
}
