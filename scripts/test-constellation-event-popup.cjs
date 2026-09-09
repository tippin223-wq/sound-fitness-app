// Test the actual popup handlers and calendar render without touching saved user data.
process.env.TZ = "America/Los_Angeles";
const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
const ts = require("typescript");
const React = require("react");
const { renderToStaticMarkup } = require("react-dom/server");
const transpile = (source) => ts.transpileModule(source, {
  compilerOptions: { jsx: ts.JsxEmit.React, module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, esModuleInterop: true },
}).outputText;
function load(file, loader = require) {
  const module = { exports: {} };
  vm.runInNewContext(transpile(fs.readFileSync(file, "utf8")), { module, exports: module.exports, require: loader, React });
  return module.exports;
}
const calendar = load("lib/dashboard-calendar.ts");
const entries = [{ id: "selected", date: "2026-09-16", time: "17:35", title: "Target strength session", type: "training" }];
let calendarReact = React;
const calendarLoader = (name) => {
  if (name === "react") return calendarReact;
  if (name === "@/lib/dashboard-calendar") return calendar;
  if (name === "./useDashboardCalendarEntries") return { useDashboardCalendarEntries: () => [entries, () => {}] };
  if (name === "next/image") return () => null;
  if (name === "lucide-react") return new Proxy({}, { get: () => () => null });
  return require(name);
};
const Calendar = load("components/dashboard/DashboardCalendar.tsx", calendarLoader).default;
const focus = { id: "selected", dateKey: "2026-09-16", minutes: 17 * 60 + 35 };
const items = [{ id: "marker", date: "2026-09-16", time: "17:10", title: "Readonly marker", type: "workout" }];
const render = (initialEventFocus) => renderToStaticMarkup(React.createElement(Calendar, {
  items, initialDate: new Date(2026, 8, 8), initialEventFocus,
}));
const html = render(focus);
assert.match(html, /Wednesday, September 16/);
assert.match(html, /Sep 16.*5:00 PM.*highlighted/);
assert.match(html, /Close selected day popup/);
assert.match(html, /Edit Target strength session/);
assert.doesNotMatch(html, /Edit Readonly marker/);
assert.doesNotMatch(render(null), /Close selected day popup/);
const details = html.slice(html.indexOf('aria-label="Close selected day popup"'));
assert.ok(details.indexOf("Edit Target strength session") < details.lastIndexOf("Readonly marker"));

const page = fs.readFileSync("components/dashboard/DashboardExperience.tsx", "utf8");
const ast = ts.createSourceFile("page.tsx", page, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
function find(node, predicate) {
  if (predicate(node)) return node;
  return ts.forEachChild(node, child => find(child, predicate));
}
const labelled = (node, label) => ts.isJsxElement(node) && node.openingElement.attributes.properties.some(
  p => ts.isJsxAttribute(p) && p.name.getText(ast) === "aria-label" && p.initializer?.text === label,
);
const popupNode = find(ast, n => labelled(n, "Constellation session details"));
assert.ok(popupNode);
const state = { selected: "selected", key: 0, row: 0 };
const context = vm.createContext({
  React, X: () => null, ChevronRight: () => null,
  selectedTrainingConstellationSession: { ...focus, title: entries[0].title, fullDate: "Wednesday, September 16, 2026", time: "5:35 PM", statusText: "Planned" },
  dashboardOrbiterRows: [{ title: "Weekly Snapshot" }, { title: "Calendar" }],
  setSelectedTrainingConstellationSessionId: v => { state.selected = v; },
  setDashboardOrbiterRow: row => { state.row = row; return true; },
  setDashboardCalendarEventFocus: v => { state.focus = v; },
  setDashboardCalendarOrbitCommand: v => { state.command = v; },
  setDashboardCalendarResetKey: fn => { state.key = fn(state.key); },
});
vm.runInContext(transpile(`globalThis.popup = (${popupNode.getText(ast)});`), context);
function elements(node) {
  if (Array.isArray(node)) return node.flatMap(elements);
  return node && typeof node === "object" ? [node, ...elements(node.props?.children)] : [];
}
const close = elements(context.popup).find(n => n.props?.["aria-label"] === "Close session details");
close.props.onClick();
assert.equal(state.selected, null);
for (const name of ["onPointerDown", "onPointerMove", "onPointerUp", "onClick"]) {
  let stopped = false;
  context.popup.props[name]({ stopPropagation() { stopped = true; } });
  assert.ok(stopped, `${name} must not reach hero swipe handlers`);
}
state.selected = "selected";
context.popup.props.onKeyDown({ key: "Escape", stopPropagation() {} });
assert.equal(state.selected, null);
const view = elements(context.popup).find(n => n.type === "button" && Array.isArray(n.props.children) && n.props.children.includes("View in calendar"));
view.props.onClick();
assert.equal(state.row, 1);
assert.equal(state.focus.id, focus.id);
assert.equal(state.focus.dateKey, focus.dateKey);
assert.equal(state.focus.minutes, focus.minutes);
assert.equal(state.command, null);
assert.equal(state.key, 1);
assert.equal(state.selected, null);
// Exercise the real Edit handler in an isolated hook harness; no storage writes.
const hookState = [];
let hookIndex = 0;
calendarReact = {
  ...React,
  useState(initial) {
    const index = hookIndex++;
    if (!(index in hookState)) hookState[index] = typeof initial === "function" ? initial() : initial;
    return [hookState[index], value => { hookState[index] = typeof value === "function" ? value(hookState[index]) : value; }];
  },
  useMemo: fn => fn(), useRef: value => ({ current: value }), useEffect() {},
};
const InteractiveCalendar = load("components/dashboard/DashboardCalendar.tsx", calendarLoader).default;
const tree = () => { hookIndex = 0; return InteractiveCalendar({ items, initialEventFocus: focus }); };
elements(tree()).find(n => n.props?.["aria-label"] === "Edit Target strength session").props.onClick();
const editor = tree();
assert.ok(elements(editor).some(n => n.props?.["data-calendar-editor"] === "true"));
assert.ok(elements(editor).some(n => n.type === "input" && n.props.value === "Target strength session"));
assert.ok(elements(editor).some(n => n.props?.["aria-label"] === "Choose event time"));
console.log("PASS: close/Escape and pointer isolation; calendar handoff, exact date/hour, user-edit controls and readonly markers");
