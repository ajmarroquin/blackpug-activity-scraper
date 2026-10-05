// Runs inside the user's logged-in Black Pug tab when they click the bookmark.
// It only reads the page: it collects the visible rows from the "View Activity"
// modal (the same elements scraper.py reads), opens the export page in a new
// tab, and hands the rows to it with postMessage, addressed to that page's
// origin only. Nothing is sent to any server.
//
// The build minifies this function and the app page wraps it into the
// javascript: URL, calling it with the folder the app is served from (a
// subpath on GitHub Pages) and the app's origin.
function blackpugExport(APP_URL, APP_ORIGIN) {
  "use strict";

  var ROW_SELECTOR = "div[onclick*='toggle']";
  var FIELD_SELECTOR = "div.col-xs-12.col-sm-6";
  var MESSAGE = "blackpug-export";
  var WAIT_FOR_MODAL_MS = 15000;

  function sleep(ms) {
    return new Promise(function (resolve) { setTimeout(resolve, ms); });
  }

  function text(el) {
    return el ? (el.innerText || el.textContent || "").replace(/\s+/g, " ").trim() : "";
  }

  // Rows in a hidden tab (e.g. "Year Round Camping") are skipped, like scraper.py
  function visibleRows() {
    return Array.prototype.filter.call(document.querySelectorAll(ROW_SELECTOR), function (row) {
      return row.getClientRects().length > 0;
    });
  }

  function detailsFor(row) {
    var el = row.nextElementSibling;
    while (el && el.tagName !== "DIV") el = el.nextElementSibling;
    return el;
  }

  function readRow(row) {
    var fields = [];
    var details = detailsFor(row);
    if (details) {
      Array.prototype.forEach.call(details.querySelectorAll(FIELD_SELECTOR), function (field) {
        var label = text(field.querySelector(".col-xs-4"));
        if (label) fields.push([label, text(field.querySelector(".col-xs-8"))]);
      });
    }
    return { title: text(row), fields: fields };
  }

  async function findRows() {
    var rows = visibleRows();
    if (rows.length) return rows;
    // Open the activity modal for them if they're logged in but haven't yet
    var auth = window.authentication;
    if (!auth || typeof auth.activity !== "function") return [];
    auth.activity(0, "");
    for (var waited = 0; waited < WAIT_FOR_MODAL_MS; waited += 250) {
      await sleep(250);
      rows = visibleRows();
      if (rows.length) {
        await sleep(500); // let the rest of the list render
        return visibleRows();
      }
    }
    return [];
  }

  async function scrape() {
    var rows = await findRows();
    if (!rows.length) {
      throw new Error(
        window.authentication
          ? "No registrations found. Make sure you're logged in and have picked your Pack or Troop from the user menu (top right), then click the bookmark again."
          : "This doesn't look like a Black Pug event page. Open your council's event page (for example scoutingevent.com/640-...), log in, pick your unit, then click the bookmark again."
      );
    }
    var out = [];
    for (var i = 0; i < rows.length; i++) {
      var record = readRow(rows[i]);
      if (!record.fields.length) {
        // Details may load when the row is expanded
        rows[i].click();
        await sleep(500);
        record = readRow(rows[i]);
      }
      out.push(record);
    }
    return out;
  }

  var popup = window.open(APP_URL + "?receive", MESSAGE);
  if (!popup) {
    alert("Your browser blocked the export tab. Allow pop-ups for this site, then click the bookmark again.");
    return;
  }

  var result = scrape().then(
    function (rows) { return { type: MESSAGE + ":data", rows: rows }; },
    function (err) { return { type: MESSAGE + ":error", message: err.message }; }
  );

  // Replace a listener left by an earlier click so the data isn't sent twice
  if (window.__blackpugExportListener) {
    window.removeEventListener("message", window.__blackpugExportListener);
  }
  window.__blackpugExportListener = function (event) {
    if (event.origin !== APP_ORIGIN || event.source !== popup) return;
    if (!event.data || event.data.type !== MESSAGE + ":ready") return;
    result.then(function (message) {
      message.source = location.host;
      message.scrapedAt = new Date().toISOString();
      popup.postMessage(message, APP_ORIGIN);
    });
  };
  window.addEventListener("message", window.__blackpugExportListener);
}
