const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');

test('pain dials save the exact sided area independently from selection removal', () => {
  const ratings = [];
  const {nodes, changes, PainDial} = render(['Left Forearms', 'Neck'], {careLevels: {'Left Forearms': 7}, onCareChange: (...args) => ratings.push(args)});
  const sliders = nodes.filter(node => node.type === PainDial);
  assert.equal(sliders.length, 2);
  assert.equal(sliders[0].props.value, 7);
  assert.equal(sliders[1].props.value, undefined);
  sliders[0].props.onChange(10);
  assert.deepEqual(ratings[0], ['Left Forearms', 10]);
  assert.equal(changes.length, 0);
});
test('no areas of concern is an explicit answer independent of an empty selection', () => {
  const answers = [];
  const {nodes} = render([], {noConcerns: true, onNoConcernsChange: value => answers.push(value)});
  const checkbox = nodes.find(node => node.type === 'input' && node.props.type === 'checkbox');
  assert.equal(checkbox.props.checked, true);
  checkbox.props.onChange({target: {checked: false}});
  assert.deepEqual(answers, [false]);
  const popup = nodes.find(node => node.props?.popover === 'auto');
  assert.equal(popup.props.role, 'dialog');
});

function render(selected, extraProps = {}) {
  const exports = {}, changes = [];
  const Body = () => null;
  const PainDial = () => null;
  const jsx = (type, props) => ({type, props});
  const output = ts.transpileModule(fs.readFileSync('components/anatomy/TrainingAreaSelector.tsx', 'utf8'), {compilerOptions: {jsx: ts.JsxEmit.ReactJSX, module: ts.ModuleKind.CommonJS}}).outputText;
  vm.runInNewContext(output, {exports, require: name => name === 'react/jsx-runtime' ? {jsx, jsxs: jsx} : name === '@/lib/trainingAreaCare' ? {painLevelColor: level => level === undefined ? '#64748b' : level >= 7 ? '#f87171' : level >= 4 ? '#fbbf24' : '#67e8f9'} : name === './AreaPainDial' ? {default: PainDial} : name === 'react' ? {useRef: value => ({current: value})} : name === 'react-muscle-highlighter' ? {default: Body} : {default: {}}});
  const tree = exports.default({selected, bodyModel: 'female', onChange: value => changes.push(Array.from(value)), ...extraProps});
  const walk = node => node && typeof node === 'object' ? [node, ...[node.props?.children].flat(Infinity).flatMap(walk)] : [];
  const nodes = walk(tree);
  const dialog = nodes.find(node => node.type === 'dialog');
  dialog.props.ref.current = {dataset: {}, querySelector: () => ({textContent: ''}), showModal() {}, close() {}};
  return {nodes, Body, changes, PainDial};
}

test('shared front/back figures reflect the profile model and saved areas without sample heat data', () => {
  const {nodes, Body} = render(['Knees']);
  const figures = nodes.filter(node => node.type === Body);
  assert.equal(figures.length, 2);
  assert.deepEqual(figures.map(figure => figure.props.side), ['front', 'back']);
  for (const figure of figures) {
    assert.equal(figure.props.gender, 'female');
    assert.equal(figure.props.data.find(part => part.slug === 'knees').styles.fill, '#64748b');
    assert.equal(figure.props.data.find(part => part.slug === 'neck').styles.fill, '#1e3448');
  }
});

test('anatomy clicks add/remove a region while preserving other selected areas', () => {
  const original = ['Knees'];
  const {nodes, Body, changes} = render(original);
  const figure = nodes.find(node => node.type === Body);
  figure.props.onBodyPartPress({slug: 'neck'});
  assert.deepEqual(changes.pop(), ['Knees', 'Neck']);
  nodes.find(node => node.props?.['aria-label'] === 'Remove Knees from areas to go easy on').props.onClick();
  assert.deepEqual(changes.pop(), []);
  figure.props.onBodyPartPress({slug: 'chest'});
  assert.deepEqual(changes.pop(), ['Knees', 'Chest']);
  figure.props.onBodyPartPress({slug: 'deltoids'});
  assert.equal(changes.length, 0);
  nodes.find(node => node.type === 'button' && node.props.children === 'Left only').props.onClick();
  assert.deepEqual(changes.pop(), ['Knees', 'Left Shoulders']);
  figure.props.onBodyPartPress({slug: 'head'});
  assert.equal(changes.length, 0);
  assert.deepEqual(original, ['Knees']);
});

test('name fallback and selected labels remain accessible without dot overlays', () => {
  const {nodes, changes} = render(['Back']);
  const elbow = nodes.find(node => node.props?.['aria-label'] === 'Toggle Elbows area');
  assert.equal(elbow.type, 'button');
  assert.equal(nodes.some(node => /on (front|back) outline/.test(node.props?.['aria-label'] || '')), false);
  elbow.props.onClick();
  assert.equal(changes.length, 0);
  nodes.find(node => node.type === 'button' && node.props.children === 'Both sides').props.onClick();
  assert.deepEqual(changes.pop(), ['Back', 'Elbows']);
  nodes.find(node => node.props?.['aria-label'] === 'Remove Back from areas to go easy on').props.onClick();
  assert.deepEqual(changes.pop(), []);
});

test('drag scrolls with the pointer and suppresses removal only after a drag', () => {
  const {nodes} = render(['Back', 'Knees']);
  const rail = nodes.find(node => node.props?.['aria-label'] === 'Selected areas to go easy on');
  const target = {scrollLeft: 100, dataset: {}, setPointerCapture() {}, hasPointerCapture: () => true, releasePointerCapture() {}};
  const event = x => ({pointerId: 1, pointerType: 'mouse', button: 0, clientX: x, target: {closest: () => null}, currentTarget: target, preventDefault() {}, stopPropagation() {}});
  rail.props.onPointerDown(event(100));
  rail.props.onPointerMove(event(70));
  assert.equal(target.scrollLeft, 130);
  rail.props.onPointerUp(event(70));
  let blocked = false;
  rail.props.onClickCapture({preventDefault() {blocked = true;}, stopPropagation() {}});
  assert.equal(blocked, true);
  rail.props.onPointerDown(event(100));
  rail.props.onPointerUp(event(100));
  blocked = false;
  rail.props.onClickCapture({preventDefault() {blocked = true;}, stopPropagation() {}});
  assert.equal(blocked, false);
});
