const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
const ts = require("typescript");

// Test the production callbacks, not a second copy of their layout math.
const source = fs.readFileSync("components/dashboard/BodyCommandCenterCard.tsx", "utf8");
const ast = ts.createSourceFile("card.tsx", source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
const callbacks = {};
function visit(node) {
  if (ts.isVariableDeclaration(node) && ts.isIdentifier(node.name)) {
    if (node.name.text === "scrollToWholeCardIndex") callbacks.center = node.initializer.arguments[0].getText(ast);
    if (node.name.text === "fitWholeCards") callbacks.fit = node.initializer.getText(ast);
  }
  ts.forEachChild(node, visit);
}
visit(ast);
assert.ok(callbacks.center && callbacks.fit);
const code = ts.transpileModule(
  `const scrollToWholeCardIndex = ${callbacks.center}; const fitWholeCards = ${callbacks.fit};`,
  { compilerOptions: { target: ts.ScriptTarget.ES2020 } },
).outputText;
let selected = 0;
const items = Array.from({ length: 7 }, (_, index) => ({
  offsetWidth: 96,
  querySelector: () => index === selected ? {} : null,
}));
items.item = (index) => items[index];
const host = { clientWidth: 312 };
const scroller = {
  children: items, firstElementChild: items[0], style: {}, scrollLeft: 0,
  get clientWidth() { return Math.round(parseFloat(this.style.width)); },
  scrollTo({ left }) { this.scrollLeft = left; },
};
const context = vm.createContext({
  scrollRef: { current: scroller }, scroller, host, stats: items,
  getComputedStyle: () => ({ columnGap: "8px", paddingLeft: "4px", paddingRight: "4px" }),
});
vm.runInContext(code, context);
const run = (code) => vm.runInContext(code, context);

for (const [available, expectedCount] of [[104, 1], [208, 2], [236, 2], [312, 3], [416, 4], [462, 4], [520, 5], [728, 7], [900, 7]]) {
  host.clientWidth = available;
  for (selected = 0; selected < items.length; selected++) {
    run("fitWholeCards()");
    assert.equal(scroller.clientWidth, expectedCount * 104);
    const first = Math.max(0, Math.min(selected - Math.floor(expectedCount / 2), 7 - expectedCount));
    assert.equal(scroller.scrollLeft, first * 104, `resize: width=${available}, selection=${selected}`);
    scroller.scrollLeft = 0;
    run(`scrollToWholeCardIndex(${selected})`);
    assert.equal(scroller.scrollLeft, first * 104, `arrow: width=${available}, selection=${selected}`);
    if (selected >= Math.floor(expectedCount / 2) && selected <= 6 - Math.floor(expectedCount / 2)) {
      const distanceFromCenter = Math.abs(4 + selected * 104 + 48 - scroller.scrollLeft - scroller.clientWidth / 2);
      assert.equal(distanceFromCenter, expectedCount % 2 === 0 ? 52 : 0);
    }
    for (let index = 0; index < 7; index++) {
      const left = 4 + index * 104 + 12 - scroller.scrollLeft;
      const right = left + 72;
      assert.ok(right <= 0 || left >= scroller.clientWidth || (left >= 0 && right <= scroller.clientWidth), "no partially visible circle");
    }
  }
}
assert.match(source, /snap-x scroll-px-1/); // Snap origin includes the rail's padding.
console.log("PASS: maximum whole-circle windows at 9 widths, nearest-center selections, edge clamps, wrap targets, and resize recentering");
