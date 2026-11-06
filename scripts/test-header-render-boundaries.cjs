const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const ts=require('typescript');
const babel=require('@babel/core');
const compiler=require('babel-plugin-react-compiler');
const source=ts.createSourceFile('DashboardExperience.tsx',fs.readFileSync('components/dashboard/DashboardExperience.tsx','utf8'),ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);
const names=['DashboardHeaderMenuView','DashboardWeeklyRecapRowView','DashboardMySoundRowView','DashboardMasterJourneyRowView'];
for(const name of names)test(`${name} retains working React Compiler memoization`,()=>{
 let target;
 function find(node){if(ts.isFunctionDeclaration(node)&&node.name?.text===name)target=node;ts.forEachChild(node,find);}
 find(source);assert.ok(target,`${name} is missing`);
 const events=[];
 const result=babel.transformSync(target.getText(source),{filename:name+'.tsx',configFile:false,babelrc:false,
  parserOpts:{plugins:['typescript','jsx'],createImportExpressions:false},
  plugins:[[compiler,{compilationMode:'annotation',logger:{logEvent(_file,event){events.push(event);}}}]],
 });
 assert.equal(events.some(event=>event.kind==='CompileError'),false,JSON.stringify(events));
 const success=events.find(event=>event.kind==='CompileSuccess');
 assert.ok(success&&success.memoValues>0,'The component silently lost memoization');
 assert.match(result.code,/memo_cache_sentinel|\b_c\(/);
});
