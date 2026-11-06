const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const ts = require('typescript');
const source = ts.createSourceFile('calendar.tsx', fs.readFileSync('components/dashboard/DashboardCalendar.tsx', 'utf8'), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
const functions = [];
function visit(node) {
  if (ts.isFunctionDeclaration(node) && ['addUserEntry', 'saveEditedEntry'].includes(node.name?.text)) functions.push(node.getText(source));
  ts.forEachChild(node, visit);
}
visit(source);
function harness() {
  const state = { entries: [], saves: 0, pendingEntry: null, editingEntryId: null, editingEntryTitle: '', editingEntryTime: '', activeSelectedDate: new Date(2026,10,4), view: 'month', highlightedWeekTime: '15:00', toDateKey: () => '2026-11-04', createCalendarEntryId: () => 'draft-one' };
  for (const name of ['PendingEntry', 'EditingEntryId', 'EditingEntryTitle', 'EditingEntryTime', 'EditingTimePickerOpen', 'PendingDeleteEntryId', 'SoundSessionMenuOpen']) {
    state['set' + name] = value => { state[name[0].toLowerCase() + name.slice(1)] = value; };
  }
  state.setUserEntries = update => { state.saves++; state.entries = update(state.entries); };
  const code = ts.transpileModule(functions.join('\n'), { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText;
  return { state, ...new Function('state', 'with(state){' + code + ';return {addUserEntry,saveEditedEntry};}')(state) };
}
const option = { title: 'Strength workout', time: '17:30', type: 'workout' };
test('choosing a session opens an unsaved draft; only Save persists the edited details once', () => {
  const h = harness(); h.addUserEntry(option);
  assert.equal(h.state.saves, 0); assert.equal(h.state.entries.length, 0);
  assert.equal(h.state.editingEntryTitle, option.title);
  h.state.editingEntryTitle = 'My evening training'; h.state.editingEntryTime = '18:45';
  h.saveEditedEntry(); h.saveEditedEntry();
  assert.equal(h.state.saves, 1); assert.equal(h.state.entries.length, 1);
  assert.equal(h.state.entries[0].title, 'My evening training'); assert.equal(h.state.entries[0].time, '18:45');
  assert.equal(h.state.pendingEntry, null);
});
test('blank titles and invalid times do not save or discard a draft', () => {
  const h = harness(); h.state.view = 'week'; h.addUserEntry(option);
  assert.equal(h.state.editingEntryTime, '15:00');
  h.state.editingEntryTitle = ' '; h.saveEditedEntry();
  h.state.editingEntryTitle = 'Training'; h.state.editingEntryTime = '25:00'; h.saveEditedEntry();
  assert.equal(h.state.saves, 0); assert.ok(h.state.pendingEntry); assert.equal(h.state.entries.length, 0);
});
