const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
function moduleFrom(file, require = () => ({})) {
  const exports = {};
  vm.runInNewContext(ts.transpileModule(fs.readFileSync(file, 'utf8'), {compilerOptions: {module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX}}).outputText, {exports, require});
  return exports;
}
function dial(value) {
  const math = moduleFrom('lib/profileDial.ts');
  const changes = [];
  const jsx = (type, props) => ({type, props});
  const component = moduleFrom('components/anatomy/AreaPainDial.tsx', name => name === 'react' ? {useRef: current => ({current})} : name === 'react/jsx-runtime' ? {jsx, jsxs: jsx} : name === '@/lib/profileDial' ? math : name === '@/lib/trainingAreaCare' ? {painLevelColor: () => '#f87171'} : {default: {}});
  const tree = component.default({label: 'Left forearm', value, onChange: next => changes.push(next)});
  const target = {getBoundingClientRect: () => ({left: 0, top: 0, width: 88, height: 88}), setPointerCapture() {}, hasPointerCapture: () => true, releasePointerCapture() {}};
  const pointer = (x, y) => ({pointerId: 1, button: 0, clientX: x, clientY: y, currentTarget: target, preventDefault() {}, stopPropagation() {}});
  return {props: tree.props, changes, pointer};
}
test('circular dragging changes pain and reverses immediately at the maximum', () => {
  const {props, changes, pointer} = dial(10);
  props.onPointerDown(pointer(44, 0));
  props.onPointerMove(pointer(88, 44));
  assert.equal(changes.length, 0);
  props.onPointerMove(pointer(44, 0));
  assert.equal(changes.at(-1), 8);
  props.onPointerUp(pointer(44, 0));
});
test('center dragging and keyboard controls work without a horizontal input', () => {
  const {props, changes, pointer} = dial(4);
  props.onPointerDown(pointer(44, 44));
  props.onPointerMove(pointer(44, 20));
  assert.equal(changes.at(-1), 6);
  props.onPointerUp(pointer(44, 20));
  for (const [key, expected] of [['End', 10], ['Home', 1]]) {
    props.onKeyDown({key, preventDefault() {}, stopPropagation() {}});
    assert.equal(changes.at(-1), expected);
  }
  assert.equal(props.role, 'slider');
  assert.equal(props['aria-label'], 'Left forearm pain level');
});
