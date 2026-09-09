// Run with: node scripts/test-training-calendar-sync.cjs
// All persistence tests use an isolated, in-memory localStorage replacement.
process.env.TZ = "America/Los_Angeles";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const ts = require("typescript");

function loadTypeScript(relativePath, loader = require, globals = {}) {
  const filename = path.resolve(__dirname, "..", relativePath);
  const source = ts.transpileModule(fs.readFileSync(filename, "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  }).outputText;
  const module = { exports: {} };
  vm.runInNewContext(source, { module, exports: module.exports, require: loader, ...globals }, { filename });
  return module.exports;
}

const calendar = loadTypeScript("lib/dashboard-calendar.ts");
const constellation = loadTypeScript("lib/training-constellation.ts", (name) =>
  name === "./dashboard-calendar" ? calendar : require(name),
);

function makeStoreFixture(initialRaw, initiallyUnreadable = false) {
  const fixture = {
    raw: initialRaw,
    readFails: initiallyUnreadable,
    writeFails: false,
    notifications: 0,
    storageListener: undefined,
    api: undefined,
  };
  const window = {
    localStorage: {
      getItem() {
        if (fixture.readFails) throw new Error("Storage is blocked");
        return fixture.raw;
      },
      setItem(key, value) {
        assert.equal(key, calendar.DASHBOARD_CALENDAR_ENTRIES_KEY);
        if (fixture.writeFails) throw new Error("Storage is full");
        fixture.raw = value;
      },
    },
    addEventListener(type, listener) {
      assert.equal(type, "storage");
      fixture.storageListener = listener;
    },
    removeEventListener() {
      fixture.storageListener = undefined;
    },
  };
  const hook = loadTypeScript("components/dashboard/useDashboardCalendarEntries.ts", (name) => {
    if (name === "@/lib/dashboard-calendar") return calendar;
    if (name === "react") {
      return {
        useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot) {
          fixture.api = { subscribe, getSnapshot, getServerSnapshot };
          return getSnapshot();
        },
      };
    }
    return require(name);
  }, { window });
  fixture.useStore = hook.useDashboardCalendarEntries;
  return fixture;
}

const today = new Date(2026, 8, 7);
const nextWeek = new Date(2026, 8, 14);
const editable = { date: "2026-09-07", time: "08:05", title: "Edited", type: "cardio", id: "existing" };
const recurringSource = [
  { dateLabel: "Mon", title: "Recurring", type: "workout" },
  { date: "2026-09-08", title: "Dated", type: "recovery" },
];
const first = calendar.normalizeCalendarItems(recurringSource, today, today, [editable]);
assert.equal(first[0].dateKey, "2026-09-07");
assert.equal(first[1].dateKey, "2026-09-08");
assert.equal(first[2].id, "existing");
assert.equal(calendar.getCalendarEventMinutes(first[2], 1), 485);
assert.equal(calendar.formatCalendarTime(485), "8:05 AM");
assert.equal(calendar.normalizeCalendarItems(recurringSource, nextWeek, today)[0].dateKey, "2026-09-14");
assert.equal(calendar.normalizeCalendarItems(recurringSource, nextWeek, today)[1].dateKey, "2026-09-08");
assert.equal(calendar.normalizeCalendarItems(recurringSource, today, today)[0].id, first[0].id);
const duplicates = calendar.normalizeCalendarItems([recurringSource[0], recurringSource[0]], today, today);
assert.notEqual(duplicates[0].id, duplicates[1].id);
assert.equal(calendar.normalizeCalendarItems(undefined, today, today).length, 7);
assert.equal(calendar.calendarDateKey(calendar.parseCalendarDate("2026-09-07")), "2026-09-07");

const store = makeStoreFixture(JSON.stringify([{ date: "2026-09-07", title: "Legacy", type: "training" }]));
const [initial, setEntries] = store.useStore();
assert.ok(initial[0].id);
assert.strictEqual(store.api.getSnapshot(), initial);
assert.strictEqual(store.api.getServerSnapshot(), store.api.getServerSnapshot());
assert.equal(store.api.getServerSnapshot().length, 0);
const unsubscribe = store.api.subscribe(() => { store.notifications += 1; });
const secondConsumer = store.useStore()[0];
assert.strictEqual(initial, secondConsumer);
setEntries((previous) => [...previous, editable]);
assert.equal(store.api.getSnapshot().length, 2);
assert.strictEqual(store.useStore()[0], store.api.getSnapshot());
assert.equal(store.notifications, 1);
assert.equal(JSON.parse(store.raw).length, 2);
setEntries((previous) => previous.map((entry) =>
  entry.id === "existing" ? { ...entry, time: "09:10", title: "Changed" } : entry,
));
assert.equal(store.api.getSnapshot()[1].time, "09:10");
setEntries((previous) => previous.filter((entry) => entry.id !== "existing"));
assert.equal(store.api.getSnapshot().length, 1);
assert.equal(store.api.getSnapshot()[0].id, initial[0].id);
store.writeFails = true;
setEntries((previous) => [...previous, editable]);
assert.equal(store.api.getSnapshot().length, 2);
assert.equal(JSON.parse(store.raw).length, 1);
store.readFails = true;
assert.equal(store.api.getSnapshot().length, 2);
store.readFails = false;
assert.equal(store.api.getSnapshot().length, 2);
store.writeFails = false;
setEntries((previous) => previous);
assert.equal(JSON.parse(store.raw).length, 2);
store.raw = JSON.stringify([{ ...editable, title: "Cross-tab" }]);
store.storageListener({ key: calendar.DASHBOARD_CALENDAR_ENTRIES_KEY });
assert.equal(store.api.getSnapshot()[0].title, "Cross-tab");
store.raw = "malformed external JSON";
store.storageListener({ key: calendar.DASHBOARD_CALENDAR_ENTRIES_KEY });
assert.equal(store.api.getSnapshot()[0].title, "Cross-tab");
store.raw = null;
store.storageListener({ key: null });
assert.equal(store.api.getSnapshot().length, 0);
unsubscribe();

const blockedStore = makeStoreFixture(null, true);
const [, setBlockedEntries] = blockedStore.useStore();
blockedStore.writeFails = true;
setBlockedEntries([editable]);
blockedStore.readFails = false;
assert.equal(blockedStore.api.getSnapshot()[0].id, editable.id);
console.log("PASS: shared snapshots, stable IDs, add/edit/delete, storage failure recovery, and cross-tab sync");

assert.equal(constellation.getConstellationWeek(new Date(2026, 2, 8))[0].dateKey, "2026-03-02");
assert.equal(constellation.getConstellationWeek(new Date(2026, 2, 8))[6].dateKey, "2026-03-08");
assert.equal(constellation.getConstellationWeek(new Date(2026, 10, 1))[0].dateKey, "2026-10-26");
assert.equal(constellation.getConstellationWeek(new Date(2026, 10, 1))[6].dateKey, "2026-11-01");
assert.equal(constellation.getConstellationWeek(new Date(2026, 11, 31))[6].dateKey, "2027-01-03");
for (const date of [new Date(2026, 2, 8), new Date(2026, 10, 1), new Date(2026, 11, 31)]) {
  const monday = calendar.calendarWeekStart(date);
  const forward = calendar.calendarAddDays(monday, 7);
  const backward = calendar.calendarAddDays(forward, -7);
  assert.equal(forward.getDay(), 1);
  assert.equal(calendar.calendarDateKey(backward), calendar.calendarDateKey(monday));
  assert.equal(constellation.getConstellationWeek(forward)[0].dateKey, calendar.calendarDateKey(forward));
}
const types = ["cardio", "check-in", "completed", "nutrition", "performance", "recovery", "training", "workout"];
const source = types.map((type, index) => ({
  id: type, date: "2026-09-07", title: type, type,
  time: `08:${String(index * 5).padStart(2, "0")}`, status: type === "completed" ? "Done" : "Planned",
}));
const normalized = calendar.normalizeCalendarItems(source, today, today);
const sessions = constellation.getConstellationSessions(normalized, today);
assert.equal(normalized.length, 8);
assert.equal(normalized.some((event) => event.type === "nutrition"), true);
assert.equal(sessions.some((session) => session.id === "nutrition"), false);
assert.equal(sessions.length, 7);
assert.equal(sessions.filter((session) => session.lane === "strength").length, 3);
assert.equal(sessions[2].status, "complete");
assert.equal(sessions[0].time, "8:00 AM");
assert.equal(sessions[6].time, "8:35 AM");
assert.equal(sessions[6].title, "workout");
assert.equal(sessions[0].dateKey, "2026-09-07");
assert.equal(constellation.getConstellationSessions(normalized, nextWeek).length, 0);
const offsetEvent = calendar.normalizeCalendarItems([
  { dateISO: "2026-09-08T01:30:00Z", title: "Local evening", type: "workout" },
], today, today);
assert.equal(offsetEvent[0].dateKey, "2026-09-07");
assert.equal(constellation.getConstellationSessions(offsetEvent, today)[0].time, "6:30 PM");
const fallback = calendar.normalizeCalendarItems([
  { date: "2026-09-07", title: "One", type: "workout" },
  { date: "2026-09-07", title: "Two", type: "nutrition" },
  { date: "2026-09-07", title: "Three", type: "workout" },
], today, today);
const fallbackSessions = constellation.getConstellationSessions(fallback, today);
assert.equal(fallbackSessions.some((session) => session.title === "Two"), false);
assert.equal(fallbackSessions.find((session) => session.title === "Three").time, "6:30 PM");
const past = calendar.normalizeCalendarItems([
  { date: "2026-09-07", title: "Past but planned", type: "workout", status: "Planned" },
], new Date(2026, 8, 13), new Date(2026, 8, 13));
assert.equal(constellation.getConstellationSessions(past, new Date(2026, 8, 13))[0].status, "planned");
const entry = {
  id: "user-entry", date: "2026-09-07", title: "New strength", time: "07:00", type: "workout", status: "Planned",
};
const derive = (entries) => constellation.getConstellationSessions(
  calendar.normalizeCalendarItems(source, today, today, entries), today,
);
assert.equal(derive([entry]).length, 8);
const edited = derive([{ ...entry, title: "Renamed strength", time: "17:15" }])
  .find((session) => session.id === "user-entry");
assert.equal(edited.title, "Renamed strength");
assert.equal(edited.time, "5:15 PM");
assert.equal(derive([]).some((session) => session.id === "user-entry"), false);
console.log("PASS: training types, nutrition exclusion without calendar data loss, same-day sessions, mutations, actual time/status, local dates, DST, and year boundaries");
