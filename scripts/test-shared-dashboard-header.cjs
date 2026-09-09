const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
const ts = require("typescript");
const React = require("react");
const { renderToStaticMarkup } = require("react-dom/server");

const source = fs.readFileSync("components/dashboard/DashboardExperience.tsx", "utf8");
const route = fs.readFileSync("app/dashboard/page.tsx", "utf8");
const profile = fs.readFileSync("app/dashboard/profile/page.tsx", "utf8");
assert.match(route, /return <DashboardExperience \/>/);
assert.match(profile, /<DashboardExperience headerOnly>/);
assert.doesNotMatch(profile, /\{renderProfileOrbiterTopMenu\(\)\}/);

// Execute the actual Profile header branch: one real menu and the caller's content.
const start = source.indexOf("{headerOnly ? (");
const end = source.indexOf(") : <section", start);
assert.ok(start >= 0 && end > start);
const markup = source.slice(start + "{headerOnly ? (".length, end);
const ctx = vm.createContext({
  React,
  children: React.createElement("section", { id: "profile-content" }, "Profile"),
  renderDashboardOrbiterTopMenu: () => React.createElement("nav", null, "Shared menu"),
});
vm.runInContext(ts.transpileModule(`globalThis.result = (${markup});`, {
  compilerOptions: { jsx: ts.JsxEmit.React, target: ts.ScriptTarget.ES2020 },
}).outputText, ctx);
const html = renderToStaticMarkup(ctx.result);
assert.equal((html.match(/Shared menu/g) || []).length, 1);
assert.match(html, /id="profile-content"/);
assert.doesNotMatch(html, /Dashboard vertical orbiter/);

// Execute the shared wheel handler with/without dashboard body navigation.
const wheelStart = source.indexOf("const handleDashboardGlobalWheel =");
const wheelEnd = source.indexOf('window.addEventListener("wheel", handleDashboardGlobalWheel', wheelStart);
const wheelCode = source.slice(wheelStart, wheelEnd);
let moves = 0;
let prevented = 0;
const wheelContext = vm.createContext({
  headerOnly: true,
  dashboardHeaderPopupPinnedRef: { current: false },
  HTMLElement: class HTMLElement {},
  Element: class Element {},
  moveDashboardOrbiterRow: () => { moves++; return true; },
});
vm.runInContext(ts.transpileModule(`${wheelCode}\nglobalThis.handleWheel = handleDashboardGlobalWheel;`, {
  compilerOptions: { target: ts.ScriptTarget.ES2020 },
}).outputText, wheelContext);
const wheel = {
  deltaX: 0, deltaY: 100, target: null,
  preventDefault: () => prevented++,
  stopPropagation() {}, stopImmediatePropagation() {},
};
wheelContext.handleWheel(wheel);
assert.equal(moves, 0, "Profile wheel must not move invisible dashboard rows");
assert.equal(prevented, 0, "Profile wheel remains available to Profile");
wheelContext.headerOnly = false;
wheelContext.handleWheel(wheel);
assert.equal(moves, 1, "Dashboard keeps existing row navigation");
assert.equal(prevented, 1);
assert.match(source, /if \(headerOnly\) return;\s+const \{ body, documentElement \}/);
assert.match(source, /if \(headerOnly \|\| dashboardDeferredRowsStage/);
assert.match(source, /if \(dashboardHeaderMeterMenuOpen\) return;[\s\S]*?if \(headerOnly\) return;/);
console.log("Shared dashboard header: Profile composition, independent scrolling, and original Dashboard navigation passed.");
