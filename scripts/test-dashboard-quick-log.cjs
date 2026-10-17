const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');

const source = fs.readFileSync(path.join(__dirname, '../components/dashboard/DashboardExperience.tsx'), 'utf8');
const ast = ts.createSourceFile('dashboard.tsx', source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
const declarations = {};
function visit(node) {
  if (ts.isVariableDeclaration(node) && ['selectExerciseReference', 'renderQuickLogPopup', 'openQuickLogPopup'].includes(node.name.getText(ast))) {
    declarations[node.name.getText(ast)] = node.initializer;
  }
  ts.forEachChild(node, visit);
}
visit(ast);
function findCallback(attributeName, predicate = () => true) {
  let result;
  function visitJsx(node) {
    if (ts.isJsxAttribute(node) && node.name.getText(ast) === attributeName && node.initializer && ts.isJsxExpression(node.initializer) && predicate(node)) {
      result = node.initializer.expression;
    }
    ts.forEachChild(node, visitJsx);
  }
  visitJsx(declarations.renderQuickLogPopup);
  assert.ok(result, `${attributeName} callback must exist in the real popup`);
  return result.getText(ast);
}
function compile(expression, env) {
  const code = ts.transpileModule(`exports.run = ${expression};`, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const exports = {};
  new Function('exports', ...Object.keys(env), code)(exports, ...Object.values(env));
  return exports.run;
}

test('actual Quick Log exercise selection advances to stats with the chosen reference and focus, preserving entered values', () => {
  const draft = { sets: '3', reps: '8', load: '20', weightUnit: 'kg', notes: 'Keep my draft' };
  const state = { references: [{ referenceType: 'exercise', referenceId: 'old' }, { referenceType: 'workout', referenceId: 'keep' }] };
  const select = compile(declarations.selectExerciseReference.getText(ast), {
    buildExerciseReference: exercise => ({ referenceType: 'exercise', referenceId: exercise.id, referenceTitle: exercise.name }),
    setManualReferences: update => { state.references = update(state.references); },
    setExerciseSelectorOpen: value => { state.selectorOpen = value; },
    setExerciseReferenceSearch: value => { state.search = value; },
  });
  const choose = compile(findCallback('onExerciseSelect'), {
    selectExerciseReference: select,
    setQuickLogSaveMessage: value => { state.message = value; },
    setQuickLogStep: value => { state.step = value; },
    quickLogStatsHeadingRef: { current: { focus: () => { state.focused = true; } } },
    window: { requestAnimationFrame: callback => callback() },
    manualStatsDraft: draft,
    setManualStatsDraft: () => assert.fail('Exercise selection must not clear unfinished values'),
  });
  for (const exercise of [{ id: 'squat', name: 'Squat' }, { id: 'row', name: 'Row' }]) {
    choose(exercise);
    assert.equal(state.step, 'stats');
    assert.equal(state.focused, true);
    assert.equal(state.message, '');
    assert.equal(state.references[0].referenceId, exercise.id);
    assert.equal(state.references.filter(ref => ref.referenceType === 'exercise').length, 1);
    assert.equal(state.references[1].referenceId, 'keep');
    assert.equal(draft.load, '20');
  }
});

test('actual Quick Log opening starts at the exercise step without discarding the existing selection or draft', () => {
  const state = {};
  compile(declarations.openQuickLogPopup.getText(ast), {
    setQuickLogPopupOpen: value => { state.open = value; },
    setQuickLogStep: value => { state.step = value; },
    setQuickLogSaveMessage: value => { state.message = value; },
    selectedExerciseReference: { referenceId: 'row' },
    setManualStatsDraft: () => assert.fail('Opening must preserve the draft'),
  })();
  assert.deepEqual(state, { open: true, step: 'exercise', message: '' });
});

test('actual Change exercise control returns to the picker without saving or clearing values', () => {
  let step;
  const callback = findCallback('onClick', node => node.parent.parent.parent.getText(ast).includes('Change exercise'));
  compile(callback, {
    setQuickLogStep: value => { step = value; },
    setManualStatsDraft: () => assert.fail('Changing exercise must preserve the draft'),
    saveQuickLogStats: () => assert.fail('Changing exercise must not save stats'),
  })();
  assert.equal(step, 'exercise');
});
