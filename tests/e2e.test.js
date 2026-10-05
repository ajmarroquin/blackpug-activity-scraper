// End-to-end: the built site and a fake Black Pug page on two different
// origins, the bookmarklet clicked for real, and the downloaded workbook read
// back. Needs `npm run build` first (npm test does it) and Playwright's Chromium.
import { after, before, test } from "node:test";
import assert from "node:assert/strict";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import ExcelJS from "exceljs";
import { chromium } from "playwright";

import { startServer, vercelHeaders } from "../scripts/serve.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const servers = [];
let browser, blackpugOrigin;
// Vercel and `npm run serve`: site at the root, policy sent as headers
let vercelUrl;
// GitHub Pages: site under /<repo>/, no custom headers (policy comes from the meta tag)
let pagesUrl;

before(async () => {
  const listen = async (options) => {
    const server = await startServer(options);
    servers.push(server);
    return `http://127.0.0.1:${server.address().port}`;
  };
  vercelUrl = `${await listen({ dir: join(root, "dist"), headers: await vercelHeaders() })}/`;
  pagesUrl = `${await listen({ dir: join(root, "dist"), base: "/blackpug-activity-scraper/" })}/blackpug-activity-scraper/`;
  blackpugOrigin = await listen({ dir: join(root, "tests", "fixtures") });
  browser = await chromium.launch();
});

after(async () => {
  await browser?.close();
  for (const server of servers) server.close();
});

// Opens the fake Black Pug page, clicks the bookmarklet, returns the export tab
async function runBookmarklet(query = "", appUrl = vercelUrl) {
  const context = await browser.newContext();
  await context.clock.setFixedTime(new Date(2026, 9, 5, 12, 0)); // Oct 5, 2026
  const problems = [];

  const landing = await context.newPage();
  await landing.goto(appUrl);
  const href = await landing.getAttribute("#bookmarklet", "href");
  assert.match(href, /^javascript:/);
  assert.ok(decodeURIComponent(href).includes(appUrl), "bookmarklet points back at the app");

  const blackpug = await context.newPage();
  await blackpug.goto(`${blackpugOrigin}/blackpug-page.html${query}`);
  // A click on a javascript: link runs it in the page, just like a bookmark
  await blackpug.evaluate((code) => {
    const a = document.createElement("a");
    a.id = "test-bookmark";
    a.href = code;
    a.textContent = "bookmark";
    document.body.append(a);
  }, href);
  const [popup] = await Promise.all([context.waitForEvent("page"), blackpug.click("#test-bookmark")]);
  popup.on("console", (msg) => msg.type() === "error" && problems.push(msg.text()));
  popup.on("pageerror", (err) => problems.push(err.message));
  await popup.waitForLoadState();
  return { context, popup, problems };
}

async function summaryRows(popup) {
  return popup.$$eval("#summary tbody tr", (trs) =>
    trs.map((tr) => [...tr.children].map((td) => td.textContent)),
  );
}

const HOSTING = [
  ["at the site root", () => vercelUrl],
  ["under a GitHub Pages subpath", () => pagesUrl],
];
for (const [hosting, appUrl] of HOSTING) {
  test(`exports the visible registrations to Excel, served ${hosting}`, async () => {
    const { context, popup, problems } = await runBookmarklet("", appUrl());
    await popup.waitForSelector("#export-body:not([hidden])");
    assert.ok(popup.url().startsWith(appUrl()), "export tab opens on the same site");

    assert.match(await popup.textContent("#status"), /Got 6 registrations from 127\.0\.0\.1/);
    assert.deepEqual(await summaryRows(popup), [
      ["Fall Cub Activity Day & Family Fun Weekend 2026 - Fall Cub Activity Day", "2", "6", "1"],
      ["2026 Spring Camporee", "1", "1", "0"],
    ]);
    assert.match(await popup.textContent("#duplicates-summary"), /^1 duplicate/);

    await popup.check("input[value=last_year]");
    assert.deepEqual(await summaryRows(popup), [["Summer Day Camp 2025", "1", "3", "0"]]);
    await popup.check("input[value=current_year]");

    const [download] = await Promise.all([popup.waitForEvent("download"), popup.click("#download")]);
    assert.equal(download.suggestedFilename(), "blackpug-registrants-2026.xlsx");
    const wb = new ExcelJS.Workbook();
    await wb.xlsx.readFile(await download.path());
    assert.deepEqual(wb.worksheets.map((ws) => ws.name), ["Fall Cub Activity Day  Family F", "2026 Spring Camporee"]);

    const fallCub = wb.worksheets[0];
    assert.deepEqual(
      Array.from(fallCub.getRow(5).values).slice(1),
      ["Sep 29, 2026 at 11:46 PM", "Sam Sample", "sam@example.com", 4, 6405439904],
      "collapsed rows are read without expanding them",
    );
    assert.equal(fallCub.getCell("A11").value, "Lee Placeholder");
    assert.equal(wb.worksheets[1].getCell("B4").value, "Sam Sample", "lazy rows are expanded and read");

    assert.deepEqual(problems, [], "no console errors or CSP violations on the export page");
    await context.close();
  });
}

test("opens View Activity itself when the modal is closed", async () => {
  const { context, popup } = await runBookmarklet("?closed");
  await popup.waitForSelector("#export-body:not([hidden])");
  assert.match(await popup.textContent("#status"), /Got 6 registrations/);
  await context.close();
});

test("explains what to do when run on the wrong page", async () => {
  const { context, popup } = await runBookmarklet("?logged-out");
  await popup.waitForSelector("#error:not([hidden])");
  assert.match(await popup.textContent("#error"), /doesn't look like a Black Pug event page/);
  await context.close();
});

test("tells people to use the bookmark if they open the export page directly", async () => {
  const context = await browser.newContext();
  const page = await context.newPage();
  await page.goto(`${vercelUrl}?receive`);
  assert.match(await page.textContent("#error"), /clicking the Export from Black Pug bookmark/);
  await context.close();
});
