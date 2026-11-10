const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const Module = require('node:module');
const ts = require('typescript');
const file = require('node:path').resolve('components/profile/ProfileTimeWindow.tsx');
const loaded = new Module(file, module);
loaded.filename = file; loaded.paths = module.paths;
loaded.require = name => name === './ProfileAvailabilityGrid' ? { AvailabilityGrid: () => null } : require(name);
loaded._compile(ts.transpileModule(fs.readFileSync(file,'utf8'), {compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX}}).outputText,file);
const parse = loaded.exports.parseProfileTimeWindow;
test('profile times preserve minute accuracy and interpret noon, midnight and overnight windows', () => {
  assert.deepEqual(parse('9:17 AM - 5:43 PM'), {start:'09:17',end:'17:43'});
  assert.deepEqual(parse('11 PM – 6:30 AM'), {start:'23:00',end:'06:30'});
  assert.deepEqual(parse('12 AM to 12 PM'), {start:'00:00',end:'12:00'});
  assert.deepEqual(parse('09:17 - 17:43'), {start:'09:17',end:'17:43'});
});
test('partial windows do not invent missing times and legacy prose is not parsed as a time', () => {
  assert.deepEqual(parse('09:17 - '), {start:'09:17',end:''});
  assert.deepEqual(parse(' - 17:43'), {start:'',end:'17:43'});
  for(const text of ['Night shifts vary weekly','9 - 5','25:00 - 26:00','9:99 AM - 14 PM','']) assert.deepEqual(parse(text),{start:'',end:''});
});

test('shared weekly grid includes seven complete days and preserves overnight selections', () => {
  const gridFile=require('node:path').resolve('components/profile/ProfileAvailabilityGrid.tsx');
  const grid=new Module(gridFile,module); grid.filename=gridFile; grid.paths=module.paths;
  grid.require=name=>name.endsWith('.css') ? {} : require(name);
  grid._compile(ts.transpileModule(fs.readFileSync(gridFile,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX}}).outputText,gridFile);
  const React=require('react');
  const html=require('react-dom/server').renderToStaticMarkup(React.createElement(grid.exports.AvailabilityGrid,{value:['Monday 11:00 PM','Tuesday 12:00 AM'],onChange:()=>{},wide:true}));
  assert.equal((html.match(/data-availability-value=/g)||[]).length,168);
  assert.match(html,/aria-label="Monday at 11:00 PM" aria-pressed="true"/);
  assert.match(html,/aria-label="Tuesday at 12:00 AM" aria-pressed="true"/);
  assert.match(html,/data-time-band="morning"/);
  assert.match(html,/data-time-band="night"/);
});

test('work summary groups matching days, keeps split shifts, and handles midnight', () => {
  const summarize=loaded.exports.summarizeWorkHours;
  assert.deepEqual(summarize(['Monday 9:00 AM','Monday 10:00 AM','Tuesday 9:00 AM','Tuesday 10:00 AM','Monday 2:00 PM','Tuesday 2:00 PM','Friday 11:00 PM']), ['Mon, Tue: 9 AM–11 AM, 2 PM–3 PM','Fri: 11 PM–12 AM']);
  assert.deepEqual(summarize([]),[]);
});
