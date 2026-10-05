import { test } from "node:test";
import assert from "node:assert/strict";

import {
  FILTERS,
  groupRegistrations,
  isCurrentYearEvent,
  isFutureEvent,
  isLastYearEvent,
  parseRow,
} from "../web/lib/registrations.js";
import { SAMPLE_ROWS, TODAY } from "./fixtures/sample-rows.js";

test("parseRow pulls the event name, registration number and fields", () => {
  const { eventKey, notBooked, record } = parseRow(SAMPLE_ROWS[0]);
  assert.equal(eventKey, "Fall Cub Activity Day & Family Fun Weekend 2026 - Fall Cub Activity Day");
  assert.equal(notBooked, false);
  assert.deepEqual(record, {
    "Booked On": "Oct 03, 2026 at 09:57 AM",
    Participants: 2,
    "Contact Name": "Pat Example",
    Email: "pat@example.com",
    "Registration Number": 6405450292,
  });
});

test("parseRow strips the Not Booked prefix and keeps colons in event names", () => {
  assert.equal(parseRow(SAMPLE_ROWS[2]).notBooked, true);
  assert.equal(
    parseRow(SAMPLE_ROWS[2]).eventKey,
    "Fall Cub Activity Day & Family Fun Weekend 2026 - Fall Cub Activity Day",
  );
  const { eventKey } = parseRow({ title: "May 01, 2026: Camp: Week 1 (12)", fields: [] });
  assert.equal(eventKey, "Camp: Week 1");
});

test("non-numeric participant counts become 0", () => {
  assert.equal(parseRow(SAMPLE_ROWS[6]).record.Participants, 0);
});

test("date filters", () => {
  assert.equal(isFutureEvent("Oct 05, 2026: Today (1)", TODAY), true);
  assert.equal(isFutureEvent("Oct 04, 2026: Yesterday (1)", TODAY), false);
  assert.equal(isFutureEvent("Xyz 04, 2027: Bad month (1)", TODAY), false);
  assert.equal(isFutureEvent("Feb 30, 2026: Impossible date in 2026 (1)", TODAY), true);
  assert.equal(isFutureEvent("Undated event 2025", TODAY), false);

  assert.equal(isCurrentYearEvent("Mar 07, 2026: Camporee (1)", TODAY), true);
  assert.equal(isCurrentYearEvent("Jun 12, 2025: Camp 2026 (1)", TODAY), false);
  assert.equal(isCurrentYearEvent("Undated event 2026", TODAY), true);

  assert.equal(isLastYearEvent("Jun 12, 2025: Camp (1)", TODAY), true);
  assert.equal(isLastYearEvent("Mar 07, 2026: Camporee 2025 (1)", TODAY), false);
});

test("groupRegistrations groups by event and removes already-booked people from not-booked", () => {
  const events = groupRegistrations(SAMPLE_ROWS, FILTERS.currentYear, TODAY);
  assert.deepEqual(
    events.map((e) => [e.name, e.booked.length, e.notBooked.length, e.removed.length]),
    [
      ["Fall Cub Activity Day & Family Fun Weekend 2026 - Fall Cub Activity Day", 2, 1, 1],
      ["Fall Cub Activity Day & Family Fun Weekend 2026 - Family Fun Weekend", 1, 0, 0],
      ["2026 Spring Camporee", 1, 0, 0],
      ["Pinewood Derby Workshop", 0, 1, 0],
    ],
  );
  const [fallCub] = events;
  assert.equal(fallCub.removed[0]["Registration Number"], 6405400001);
  assert.equal(fallCub.notBooked[0]["Contact Name"], "Lee Placeholder");
});

test("groupRegistrations applies each filter", () => {
  const names = (filter) => groupRegistrations(SAMPLE_ROWS, filter, TODAY).map((e) => e.name);
  assert.deepEqual(names(FILTERS.future), [
    "Fall Cub Activity Day & Family Fun Weekend 2026 - Fall Cub Activity Day",
    "Fall Cub Activity Day & Family Fun Weekend 2026 - Family Fun Weekend",
    "Pinewood Derby Workshop",
  ]);
  assert.deepEqual(names(FILTERS.lastYear), ["Summer Day Camp 2025"]);
});

test("a missing email doesn't count as a match", () => {
  const rows = [
    { title: "Oct 17, 2026: Hike (1)", fields: [["Contact Name", "A"]] },
    { title: "Oct 17, 2026: Not Booked Hike (2)", fields: [["Contact Name", "B"]] },
  ];
  const [hike] = groupRegistrations(rows, FILTERS.future, TODAY);
  assert.equal(hike.notBooked.length, 1);
  assert.equal(hike.removed.length, 0);
});
