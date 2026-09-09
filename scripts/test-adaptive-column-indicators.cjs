const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
const ts = require("typescript");
const React = require("react");
const slots = [];
let cursor = 0;
let effect;
let motionEffect;
let reducedMotion = false;
let resize;
let disconnected = false;
const changes = [];
const mockReact = {
  ...React,
  useRef(value) { const i = cursor++; return slots[i] ??= { current: value }; },
  useState(value) { const i = cursor++; slots[i] ??= value; return [slots[i], (next) => { slots[i] = typeof next === "function" ? next(slots[i]) : next; }]; },
  useLayoutEffect(callback, dependencies) { if (dependencies.length === 1) effect ??= callback; else motionEffect = callback; },
};
const exportsObject = {};
const context = vm.createContext({
  exports: exportsObject,
  require: (name) => name === "react" ? mockReact : require(name),
  requestAnimationFrame: (callback) => { callback(); return 1; },
  cancelAnimationFrame() {},
  window: { matchMedia: () => ({ matches: reducedMotion }) },
  ResizeObserver: class { constructor(callback) { resize = callback; } observe() {} disconnect() { disconnected = true; } },
});
vm.runInContext(ts.transpileModule(fs.readFileSync("components/dashboard/AdaptiveColumnIndicators.tsx", "utf8"), {
  compilerOptions: { jsx: ts.JsxEmit.ReactJSX, module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
}).outputText, context);
let activeIndex = 0;
const children = Array.from({ length: 4 }, (_, index) => React.createElement("button", { key: index }, `Option ${index}`));
const render = () => { cursor = 0; return exportsObject.default({ children, activeIndex, label: "Test", onSelect: (index) => changes.push(index) }); };
render();
slots[0].current = { clientWidth: 400, children: [90, 90, 90, 90].map((width) => ({ offsetWidth: width, querySelector: () => ({ focus() {} }) })) };
const cleanup = effect();
assert.equal(render().props["data-column-indicator-layout"], "flat");
assert.ok(render().props.children.every((item) => item.props.style === undefined));
slots[0].current.clientWidth = 240;
resize();
assert.equal(render().props["data-column-indicator-layout"], "orbit");
assert.match(render().props.children[1].props.style.transform, /rotateY\(-32deg\)/);
assert.equal(render().props.children[2].props.inert, true);
resize();
assert.equal(render().props["data-column-indicator-layout"], "orbit", "measuring the orbit must not oscillate modes");
activeIndex = 3;
assert.equal(render().props.children[3].props.style.opacity, 1);
render().props.onKeyDown({ key: "ArrowRight", stopPropagation() {}, preventDefault() {} });
assert.equal(changes.at(-1), 0, "keyboard navigation wraps");
slots[0].current.clientWidth = 372;
resize();
assert.equal(render().props["data-column-indicator-layout"], "flat", "exact fit restores flat mode");
slots[0].current.children[0].offsetWidth = 110;
resize();
assert.equal(render().props["data-column-indicator-layout"], "orbit", "content width changes are observed");
slots[0].current.clientWidth = 343;
resize();
assert.equal(render().props.children.filter((item) => !item.props.inert).length, 3, "long labels get one spaced neighbor per side");
const labelTransform = render().props.children[0].props.style.transform;
assert.ok(Number(labelTransform.match(/translateX\(([-\d.]+)px\)/)[1]) > 90, "label spacing exceeds compact icon slots");
slots[0].current.children.forEach((item) => { item.offsetWidth = 32; });
slots[0].current.clientWidth = 110;
resize();
assert.match(render().props.children[0].props.style.transform, /rotateY\(-38deg\).*scale\(0.76\)/, "icon-only orbit retains its original geometry");
const motions = [];
slots[0].current.children.forEach((item) => {
  item.offsetWidth = 100;
  item.getAnimations = () => [];
  item.animate = (frames) => { motions.push(frames); return { cancel() {} }; };
});
slots[0].current.clientWidth = 343;
resize();
const commitMotion = () => {
  const tree = render();
  tree.props.children.forEach((item, index) => {
    const element = slots[0].current.children[index];
    element.dataset = { orbitDistance: String(item.props["data-orbit-distance"]) };
    element.style = { ...item.props.style, opacity: String(item.props.style.opacity) };
  });
  motionEffect();
};
activeIndex = 0;
commitMotion();
activeIndex = 1;
commitMotion();
assert.equal(motions.length, 1);
assert.match(motions[0][1].transform, /translateX\(-/ , "outgoing left pill exits left instead of crossing the center");
assert.equal(motions[0][1].opacity, 0);
activeIndex = 0;
commitMotion();
assert.match(motions[1][0].transform, /translateX\(-/, "wrapped left neighbor enters from the left");
assert.equal(motions[1][0].opacity, 0);
reducedMotion = true;
activeIndex = 1;
commitMotion();
assert.equal(motions.length, 2, "reduced motion disables wrap animation");
cleanup();
assert.equal(disconnected, true);
console.log("PASS: actual overflow, exact-fit restoration, stable orbit measurement, content resizing, keyboard wrap, and observer cleanup");
