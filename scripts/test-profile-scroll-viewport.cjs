const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');

test('profile viewport owns a cancellable native wheel listener and cleans it up', () => {
  const source = fs.readFileSync('components/profile/ProfileExperience.tsx', 'utf8');
  const component = source.slice(source.indexOf('function ProfileScrollViewport('), source.indexOf('function SelectionCardHelp('));
  const effects = [], listeners = new Map(), forwarded = {current: null};
  const node = {
    addEventListener(name, handler, options) { listeners.set(name, {handler, options}); },
    removeEventListener(name, handler) { if (listeners.get(name)?.handler === handler) listeners.delete(name); },
  };
  const exports = {};
  const jsx = (type, props) => ({type, props});
  vm.runInNewContext(ts.transpileModule(`const {useRef,useLayoutEffect,useEffect,useCallback}=require('hooks');${component}\nexports.mount=ProfileScrollViewport;`, {compilerOptions: {module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX}}).outputText, {
    exports, require: name => name === 'react/jsx-runtime' ? {jsx} : {
      useRef: current => ({current}), useLayoutEffect: fn => fn(), useEffect: fn => effects.push(fn), useCallback: fn => fn,
    },
  });
  let handled = 0;
  const tree = exports.mount({viewportRef: forwarded, onWheelNative: event => {handled++; event.preventDefault(); event.stopPropagation();}, children: 'Profile rows', 'aria-label': 'Profile orbiter rows and cards'});
  tree.props.ref(node);
  const cleanup = effects[0]();
  assert.equal(forwarded.current, node);
  assert.equal(tree.props.children, 'Profile rows');
  assert.equal(tree.props.onWheel, undefined);
  assert.equal(listeners.get('wheel').options.passive, false);
  const event = {prevented: false, stopped: false, preventDefault() {this.prevented = true;}, stopPropagation() {this.stopped = true;}};
  listeners.get('wheel').handler(event);
  assert.equal(handled, 1);
  assert.equal(event.prevented && event.stopped, true);
  cleanup();
  assert.equal(listeners.size, 0);
});
