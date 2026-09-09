const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
const ts = require("typescript");
const source = fs.readFileSync("components/dashboard/headerExerciseClearance.ts", "utf8");
let offset = 0;
let nextFrame;
let nextTick;
let cleaned = 0;
const box = (left, right, top = 20, bottom = 60) => ({ left, right, top, bottom, width: right - left, height: bottom - top });
const piece = (left, right) => ({ getBoundingClientRect: () => box(left + offset, right + offset) });
const dock = {
  offsetWidth: 40, dataset: { exerciseHidden: "true" },
  getBoundingClientRect: () => box(100 + offset, 140 + offset),
  querySelectorAll: () => [piece(100, 140), piece(80, 160), piece(105, 135)],
  contains: () => false,
  style: {
    getPropertyValue: () => String(offset),
    setProperty: (_, value) => { offset = parseFloat(value); },
  },
};
const title = { textContent: "Page title", checkVisibility: () => true, getBoundingClientRect: () => box(0, 40) };
let obstacleLeft = 170;
const obstacle = {
  contains: () => false, checkVisibility: () => true,
  getBoundingClientRect: () => box(obstacleLeft, obstacleLeft + 30),
};
const shell = {
  dataset: { headerFocus: "content" },
  querySelector: selector => selector.includes("category-dock") ? dock : title,
  querySelectorAll: () => [obstacle],
  getBoundingClientRect: () => box(0, 300, 0, 100),
};
const context = vm.createContext({
  exports: {}, NodeFilter: { SHOW_TEXT: 4 },
  document: {
    hidden: false, documentElement: { clientWidth: 300 }, fonts: { ready: { then() {} } },
    createTreeWalker: () => { let first = true; return {
      currentNode: { textContent: "Page title" }, nextNode: () => { const result = first; first = false; return result; },
    }; },
    createRange: () => ({ selectNodeContents() {}, getBoundingClientRect: () => box(0, 40) }),
  },
  window: {
    innerHeight: 100, setInterval: callback => { nextTick = callback; return 2; },
    clearInterval: () => cleaned++, addEventListener() {}, removeEventListener: () => cleaned++,
  },
  requestAnimationFrame: callback => { nextFrame = callback; return 1; },
  cancelAnimationFrame: () => cleaned++,
});
vm.runInContext(ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
}).outputText, context);
const cleanup = context.exports.watchHeaderExerciseClearance(shell);
nextFrame();
assert.equal(offset, -26, "Position from longest label edge, not the narrower figure");
assert.equal(dock.dataset.exerciseHidden, "true", "Initial idle fit cannot approve full-size visibility");
shell.dataset.headerFocus = "header";
nextTick();
assert.equal(dock.dataset.exerciseHidden, "false", "Visible with 14px clearance");
shell.dataset.headerFocus = "content";
nextTick();
assert.equal(dock.dataset.exerciseHidden, "false", "Idle may retain a verified open fit");
nextTick();
assert.equal(offset, -26, "Stable measurement does not drift");
shell.dataset.headerFocus = "header";
obstacleLeft = 140;
nextTick();
assert.equal(dock.dataset.exerciseHidden, "true", "Hide before crowding an interactive control");
obstacleLeft = 170;
shell.dataset.headerFocus = "content";
nextTick();
assert.equal(dock.dataset.exerciseHidden, "true", "Extra idle room must not override a failed open fit");
shell.dataset.headerFocus = "header";
context.document.documentElement.clientWidth = 140;
nextTick();
assert.equal(dock.dataset.exerciseHidden, "true", "Hide when full label plus margin cannot fit viewport");
context.document.documentElement.clientWidth = 300;
nextTick();
assert.equal(dock.dataset.exerciseHidden, "false", "Reappears without changing nav layout");
shell.dataset.headerFocus = "content";
context.document.documentElement.clientWidth = 400;
nextTick();
assert.equal(dock.dataset.exerciseHidden, "true", "Resizing idle invalidates the old full-size fit");
shell.dataset.headerFocus = "header";
shell.dataset.headerTransitioning = "true";
nextTick();
assert.equal(dock.dataset.exerciseHidden, "true", "Transition geometry cannot approve visibility");
delete shell.dataset.headerTransitioning;
nextTick();
assert.equal(dock.dataset.exerciseHidden, "false", "A settled open header can approve the new viewport");
shell.dataset.headerFocus = "content";
title.textContent = "A longer page title";
nextTick();
assert.equal(dock.dataset.exerciseHidden, "true", "Changed text needs a fresh open fit");
cleanup();
assert.equal(cleaned, 3, "Cancel frame, interval, and resize listener");
const page = fs.readFileSync("components/dashboard/DashboardExperience.tsx", "utf8");
const headerTitle = page.slice(page.indexOf('className="dashboard-header-selector-copy'), page.indexOf('className="dashboard-header-selector-category-dock'));
assert.doesNotMatch(headerTitle, /dashboard-header-urgency-blinker/);
assert.match(headerTitle, /getDashboardHeaderActiveJourneyStepLabel/);
console.log("PASS: longest-text clearance, stable positioning, collision hiding, viewport bounds, restoration, cleanup, and urgency removal");
