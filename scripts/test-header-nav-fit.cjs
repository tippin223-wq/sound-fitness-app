const assert = require('node:assert/strict');
const fs = require('node:fs');
const test = require('node:test');
const ts = require('typescript');

test('idle header fits the entire natural navigation width without double shrinking', () => {
  const source = fs.readFileSync('components/dashboard/DashboardExperience.tsx', 'utf8');
  const ast = ts.createSourceFile('header.tsx', source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  let declaration;
  function visit(node) {
    if (ts.isVariableDeclaration(node) && node.name.getText(ast) === 'fitDashboardHeaderNav') declaration = node.getText(ast);
    ts.forEachChild(node, visit);
  }
  visit(ast);
  assert.ok(declaration);
  const values = new Map();
  const style = {
    getPropertyValue: key => values.get(key) ?? '',
    getPropertyPriority: () => '',
    setProperty: (key, value) => values.set(key, value),
    removeProperty: key => values.delete(key),
  };
  let laneWidth = 199;
  const block = {
    get clientWidth() { return laneWidth; },
    get offsetWidth() { return laneWidth; },
    getBoundingClientRect: () => ({ width: laneWidth * 0.6 }),
  };
  let widthReads = 0;
  const selector = { style, get scrollWidth() { widthReads++; return 320; }, offsetWidth: 320, textContent: 'Training Sessions Dashboard', closest: () => block };
  const document = { querySelector: query => query === '.dashboard-header-vortex-shell' ? { dataset: { headerFocus: 'content' } } : selector };
  const window = { innerWidth: 359, innerHeight: 572 };
  const code = ts.transpileModule(`let lastDashboardNavFitInputs=''; const dashboardNavNaturalSizeCache=new Map(); const alignDashboardMobileHeaderLane=()=>{}; const fitDashboardHeaderNavCopy=()=>{}; const ${declaration}; exports.fit=fitDashboardHeaderNav;`, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;
  const api = {};
  new Function('document', 'window', 'exports', code)(document, window, api);
  values.set('zoom', '0.48');
  api.fit();
  assert.equal(Number(values.get('zoom')), 1, 'idle removes the previous open fit when the full scaled group fits');
  const measuredReads = widthReads;
  laneWidth = 180;
  api.fit();
  assert.equal(widthReads, measuredReads, 'a lane resize reuses the label measurement without another zoom/layout probe');
  laneWidth = 100;
  window.innerWidth = 280;
  api.fit();
  const zoom = Number(values.get('zoom'));
  assert.ok(zoom < 1);
  assert.ok(selector.scrollWidth * 0.6 * zoom <= laneWidth + 0.01, 'complete title stays inside a tight lane');
  assert.equal(values.has('transition'), false, 'measurement restores transition styles');
});

test('continuous navigation wheel input advances steadily instead of waiting for silence', () => {
  const source=fs.readFileSync('components/dashboard/DashboardExperience.tsx','utf8');
  const ast=ts.createSourceFile('header.tsx',source,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);
  let declaration;
  function visit(node){
    if(ts.isVariableDeclaration(node)&&node.name.getText(ast)==='handleDashboardHeaderScrollButtonWheel')declaration=node.getText(ast);
    ts.forEachChild(node,visit);
  }
  visit(ast);assert.ok(declaration);
  let now=1000;const steps=[];
  const context={
    Date:{now:()=>now},
    DASHBOARD_HEADER_NAV_REPEAT_MS:180,
    dashboardHeaderNavWheelGestureRef:{current:null},
    dashboardHeaderScrollButtonWheelLockRef:{current:0},
    getDashboardAnalogRepeatMs:()=>180,
    runDashboardHeaderScrollButtonDirection:direction=>{steps.push({direction,at:now});return true;},
  };
  const code=ts.transpileModule(`const ${declaration}; return handleDashboardHeaderScrollButtonWheel;`,{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText;
  const wheel=new Function(...Object.keys(context),code)(...Object.values(context));
  let prevented=0;
  for(let elapsed=0;elapsed<=400;elapsed+=16){
    now=1000+elapsed;
    wheel({deltaX:20,deltaY:0,preventDefault:()=>prevented++,stopPropagation:()=>{}});
  }
  assert.equal(steps.length,3,'a sustained swipe keeps advancing, at a bounded rate');
  assert.ok(steps.every(step=>step.direction==='right'));
  assert.equal(prevented,26,'momentum cannot scroll the page behind the header');
});


test('long nav copy shrinks within its track without resizing either joystick',()=>{
  const source=fs.readFileSync('components/dashboard/DashboardExperience.tsx','utf8');
  const ast=ts.createSourceFile('header.tsx',source,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);
  let declaration;
  function visit(node){if(ts.isVariableDeclaration(node)&&node.name.getText(ast)==='fitDashboardHeaderNavCopy')declaration=node.getText(ast);ts.forEachChild(node,visit);}
  visit(ast);assert.ok(declaration);
  const values=new Map();
  const text={scrollWidth:240};
  const copy={clientWidth:128,firstElementChild:text,style:{getPropertyValue:key=>values.get(key)||'',setProperty:(key,value)=>values.set(key,value)}};
  const code=ts.transpileModule('const '+declaration+'; return fitDashboardHeaderNavCopy;',{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText;
  const fit=new Function('document','getComputedStyle',code)({querySelector:()=>copy},()=>({paddingLeft:'4px',paddingRight:'4px'}));
  fit();assert.equal(values.get('--dashboard-nav-copy-scale'),'0.5');
  assert.equal(values.size,1,'only the copy scale changes; group width, zoom and position are untouched');
  text.scrollWidth=70;fit();assert.equal(values.get('--dashboard-nav-copy-scale'),'1');
});
