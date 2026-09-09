const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
const ts = require("typescript");
const React = require("react");

const slots = [];
let cursor = 0;
const mockedReact = {
  ...React,
  useId: () => "fuel-test",
  useRef(value) { const i = cursor++; return slots[i] ??= { current: value }; },
  useState(value) { const i = cursor++; slots[i] ??= value; return [slots[i], (next) => { slots[i] = next; }]; },
};
const exportsObject = {};
const context = vm.createContext({
  exports: exportsObject,
  require: (name) => name === "react" ? mockedReact : name === "lucide-react" ? { ChevronLeft: () => null, ChevronRight: () => null } : require(name),
  window: { matchMedia: () => ({ matches: false }) },
});
vm.runInContext(ts.transpileModule(fs.readFileSync("components/dashboard/FuelLoadingCarousel.tsx", "utf8"), {
  compilerOptions: { jsx: ts.JsxEmit.ReactJSX, module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
}).outputText, context);
const children = ["Protein", "Hydration", "Meals"].map((label) => React.createElement("div", { key: label }, label));
const render = () => { cursor = 0; return exportsObject.default({ children }); };
const elements = (node) => !node || typeof node !== "object" ? [] : Array.isArray(node) ? node.flatMap(elements) : [node, ...elements(node.props?.children)];
const find = (label) => elements(render()).find((node) => node.props?.["aria-label"] === label);
const scrolls = [];
render();
slots[0].current = { children: [{ offsetLeft: 0 }, { offsetLeft: 238 }, { offsetLeft: 476 }], clientWidth: 226, scrollLeft: 0, scrollTo: (options) => scrolls.push(options.left) };
assert.equal(find("Previous fuel habit").props.disabled, true);
find("Next fuel habit").props.onClick();
find("Next fuel habit").props.onClick();
assert.deepEqual(scrolls, [238, 476]);
assert.equal(find("Next fuel habit").props.disabled, true);
find("Previous fuel habit").props.onClick();
assert.equal(scrolls.at(-1), 238);
slots[0].current.scrollLeft = 476;
find("Fuel habits").props.onScroll();
find("Fuel habits").props.onScrollEnd();
find("Previous fuel habit").props.onClick();
assert.equal(scrolls.at(-1), 238);
let stopped = 0;
render().props.onPointerDown({ stopPropagation() { stopped++; } });
render().props.onKeyDown({ key: "ArrowLeft", stopPropagation() { stopped++; }, preventDefault() {} });
assert.equal(scrolls.at(-1), 0);
assert.equal(stopped, 2);
console.log("PASS: fuel carousel boundaries, rapid arrows, swipe synchronization, keyboard control, and orbit isolation");
