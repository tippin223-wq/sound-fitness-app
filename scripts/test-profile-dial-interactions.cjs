const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');

function mount(value = 5, min = 1) {
  const source = fs.readFileSync('components/profile/ProfileExperience.tsx', 'utf8');
  const component = source.slice(source.indexOf('function CircularProfileRating('), source.indexOf('function AnimatedProfileSlider('));
  const math = {exports: {}};
  vm.runInNewContext(ts.transpileModule(fs.readFileSync('lib/profileDial.ts', 'utf8'), {compilerOptions: {module: ts.ModuleKind.CommonJS}}).outputText, {exports: math.exports});
  const effects = [], changes = [], captured = new Set(), listeners = {};
  let now = 1000;
  const node = {
    getBoundingClientRect: () => ({left: 0, top: 0, width: 260, height: 260}),
    setPointerCapture: id => captured.add(id), hasPointerCapture: id => captured.has(id), releasePointerCapture: id => captured.delete(id),
    addEventListener: (name, fn, options) => { listeners[name] = {fn, options}; },
    removeEventListener: name => { delete listeners[name]; },
  };
  const jsx = (type, props) => ({type, props});
  const exports = {};
  const prelude = `const {useRef,useState,useEffect,useLayoutEffect}=require('hooks'); const {dialAngle,dialAngleDelta,dialDragValue,dialPointValue}=require('dial'); const clampNumber=(v,min,max)=>Math.max(min,Math.min(max,v)); const SelectorIcon=()=>null;`;
  vm.runInNewContext(ts.transpileModule(prelude + component + '\nexports.render=CircularProfileRating;', {compilerOptions: {module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2020}}).outputText, {
    exports, performance: {now: () => now},
    require: name => name === 'react/jsx-runtime' ? {jsx, jsxs: jsx} : name === 'dial' ? math.exports : {
      useRef: current => ({current}), useState: initial => [initial, () => {}],
      useEffect: fn => effects.push(fn), useLayoutEffect: fn => fn(),
    },
  });
  const tree = exports.render({label: 'Intensity Preference', helper: '', min, max: 10, value, onChange: next => changes.push(next)});
  const walk = element => element && typeof element === 'object' ? [element, ...[element.props?.children].flat(Infinity).flatMap(walk)] : [];
  const dial = walk(tree).find(element => element.type === 'svg');
  dial.props.ref.current = node;
  const cleanups = effects.map(effect => effect());
  const event = (x, y, extra = {}) => ({button: 0, pointerId: 1, clientX: x, clientY: y, currentTarget: node, prevented: false, stopped: false, preventDefault() { this.prevented = true; }, stopPropagation() { this.stopped = true; }, ...extra});
  return {dial: dial.props, changes, captured, listeners, event, advance: ms => {now += ms;}, cleanup: () => cleanups.forEach(fn => fn?.())};
}

test('drag captures its pointer, changes the dial, and consumes the gesture', () => {
  const state = mount();
  const down = state.event(220, 130);
  state.dial.onPointerDown(down);
  assert.equal(state.captured.has(1), true);
  assert.equal(down.stopped, true);
  const move = state.event(130, 220);
  state.dial.onPointerMove(move);
  assert.equal(state.changes.at(-1), 8);
  assert.equal(move.prevented && move.stopped, true);
  state.dial.onPointerUp(state.event(130, 220));
  assert.equal(state.captured.size, 0);
  const click = state.event(130, 220);
  state.dial.onClickCapture(click);
  assert.equal(click.prevented && click.stopped, true);
});

test('wheel stays on dial, steps once per notch, respects endpoints and leaves browser zoom alone', () => {
  const state = mount(9);
  assert.equal(state.listeners.wheel.options.passive, false);
  const wheel = state.event(0, 0, {deltaY: 100, deltaX: 0, deltaMode: 0});
  state.listeners.wheel.fn(wheel);
  assert.deepEqual(state.changes, [10]);
  assert.equal(wheel.prevented && wheel.stopped, true);
  state.advance(100); state.listeners.wheel.fn(wheel);
  assert.deepEqual(state.changes, [10]);
  const zoom = state.event(0, 0, {ctrlKey: true, deltaY: -100});
  state.listeners.wheel.fn(zoom);
  assert.equal(zoom.prevented || zoom.stopped, false);
  state.cleanup(); assert.equal(state.listeners.wheel, undefined);
});

test('tiny drag jitter does not change the value, and pointer cancel ends dragging', () => {
  const state = mount();
  state.dial.onPointerDown(state.event(220, 130));
  state.dial.onPointerMove(state.event(220, 132));
  assert.deepEqual(state.changes, []);
  state.dial.onPointerCancel(state.event(220, 132));
  assert.equal(state.captured.size, 0);
  state.dial.onPointerMove(state.event(130, 220));
  assert.deepEqual(state.changes, []);
});
