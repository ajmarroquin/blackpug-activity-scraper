// Turns the raw rows the bookmarklet reads from Black Pug's "View Activity"
// modal into per-event booked / not-booked lists. Mirrors extract_event_rows()
// and the is_*_event() filters in scraper.py.
//
// A raw row looks like:
//   { title: "Oct 17, 2026: Fall Cub Activity Day (6405450292)",
//     fields: [["Booked On", "Oct 03, 2026 at 09:57 AM"], ["Participants", "2"], ...] }

export const FILTERS = {
  future: "future",
  currentYear: "current_year",
  lastYear: "last_year",
};

const MONTHS = {
  Jan: 1, Feb: 2, Mar: 3, Apr: 4, May: 5, Jun: 6,
  Jul: 7, Aug: 8, Sep: 9, Oct: 10, Nov: 11, Dec: 12,
};

// Event titles start with a date like "Oct 17, 2026:" or "Nov 02, 2025:"
const TITLE_DATE = /^([A-Za-z]{3})\s+(\d{1,2}),\s+(\d{4}):/;

const SKIPPED_LABELS = new Set(["Balance Due"]);

function parseTitleDate(title) {
  const match = TITLE_DATE.exec(title.trim());
  if (!match) return null;
  const [, monthStr, dayStr, yearStr] = match;
  return { month: MONTHS[monthStr] ?? null, day: Number(dayStr), year: Number(yearStr) };
}

function isValidDate({ year, month, day }) {
  const d = new Date(year, month - 1, day);
  return d.getFullYear() === year && d.getMonth() === month - 1 && d.getDate() === day;
}

function dateKey(year, month, day) {
  return year * 10000 + month * 100 + day;
}

export function isFutureEvent(title, today = new Date()) {
  const parsed = parseTitleDate(title);
  if (parsed) {
    if (parsed.month === null) return false;
    if (isValidDate(parsed)) {
      const todayKey = dateKey(today.getFullYear(), today.getMonth() + 1, today.getDate());
      return dateKey(parsed.year, parsed.month, parsed.day) >= todayKey;
    }
  }
  // Fallback to year-based filtering if date parsing fails
  const currentYear = today.getFullYear();
  for (let year = currentYear; year < currentYear + 6; year++) {
    if (title.includes(String(year))) return true;
  }
  return false;
}

export function isCurrentYearEvent(title, today = new Date()) {
  const parsed = parseTitleDate(title);
  if (parsed) return parsed.year === today.getFullYear();
  return title.includes(String(today.getFullYear()));
}

export function isLastYearEvent(title, today = new Date()) {
  const parsed = parseTitleDate(title);
  if (parsed) return parsed.year === today.getFullYear() - 1;
  return title.includes(String(today.getFullYear() - 1));
}

export function matchesFilter(title, filter, today = new Date()) {
  switch (filter) {
    case FILTERS.future:
      return isFutureEvent(title, today);
    case FILTERS.currentYear:
      return isCurrentYearEvent(title, today);
    case FILTERS.lastYear:
      return isLastYearEvent(title, today);
    default:
      throw new Error(`Unknown filter: ${filter}`);
  }
}

function toParticipants(value) {
  return /^\s*[+-]?\d+\s*$/.test(value) ? Number(value) : 0;
}

export function parseRow(raw) {
  const title = raw.title.trim();
  const notBooked = title.includes("Not Booked");

  const record = {};
  for (const [rawLabel, rawValue] of raw.fields) {
    const label = String(rawLabel).trim();
    if (!label || SKIPPED_LABELS.has(label)) continue;
    const value = String(rawValue).trim();
    record[label] = label === "Participants" ? toParticipants(value) : value;
  }

  // The registration number is the number in parentheses at the end of the title
  const regMatch = /\((\d+)\)$/.exec(title);
  if (regMatch) record["Registration Number"] = Number(regMatch[1]);

  // Clean event name: drop the date prefix, "Not Booked " prefix, and registration number
  const colon = title.indexOf(":");
  let base = colon === -1 ? title : title.slice(colon + 1).trim();
  if (base.startsWith("Not Booked ")) base = base.slice("Not Booked ".length);
  const eventKey = base.replace(/\s*\(\d+\)$/, "");

  return { eventKey, notBooked, record };
}

function emailOf(record) {
  return String(record.Email ?? "").toLowerCase().trim();
}

// Groups rows by event (in first-seen order) and drops not-booked entries for
// anyone whose email also appears in that event's booked list.
export function groupRegistrations(rawRows, filter, today = new Date()) {
  const events = new Map();

  for (const raw of rawRows) {
    if (!matchesFilter(raw.title, filter, today)) continue;
    const { eventKey, notBooked, record } = parseRow(raw);
    if (!events.has(eventKey)) {
      events.set(eventKey, { name: eventKey, booked: [], notBooked: [], removed: [] });
    }
    events.get(eventKey)[notBooked ? "notBooked" : "booked"].push(record);
  }

  for (const event of events.values()) {
    if (!event.booked.length || !event.notBooked.length) continue;
    const bookedEmails = new Set(event.booked.map(emailOf).filter(Boolean));
    const kept = [];
    for (const record of event.notBooked) {
      (bookedEmails.has(emailOf(record)) ? event.removed : kept).push(record);
    }
    event.notBooked = kept;
  }

  return [...events.values()];
}

export function totalParticipants(records) {
  return records.reduce(
    (sum, r) => sum + (typeof r.Participants === "number" ? r.Participants : 0),
    0,
  );
}
