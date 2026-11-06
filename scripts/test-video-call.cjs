const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),ts=require('typescript');
function compile(path,environment){const out={};vm.runInNewContext(ts.transpileModule(fs.readFileSync(path,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX}}).outputText,{exports:out,...environment});return out;}
const policy=compile('lib/videoCallPolicy.ts',{});
test('video eligibility and join window match scheduled online website appointments',()=>{
 const start=Date.parse('2026-11-10T21:00:00Z');assert.ok(policy.onlineVideoSession('Online coaching','scheduled'));
 for(const status of ['canceled','completed','pending_approval'])assert.equal(policy.onlineVideoSession('Online coaching',status),false);
 assert.equal(policy.onlineVideoSession('In-home training','scheduled'),false);
 assert.match(policy.videoCallWindow(new Date(start).toISOString(),start-30*60000-1),/30 minutes/);
 assert.equal(policy.videoCallWindow(new Date(start).toISOString(),start-30*60000),'');
 assert.equal(policy.videoCallWindow(new Date(start).toISOString(),start+3*3600000),'');
 assert.match(policy.videoCallWindow(new Date(start).toISOString(),start+3*3600000+1),/ended/);
});
test('app proxy forwards only the booked session and bearer to the fixed website service',async()=>{
 let calls=[],result={url:'https://sound.daily.co/sf-fixture',token:'fixture'};
 const route=compile('app/api/member/video-call/route.ts',{require:()=>({NextResponse:{json:(body,options)=>new Response(JSON.stringify(body),options)}}),URL,AbortSignal,fetch:async(url,input)=>{calls.push({url,input});return new Response(JSON.stringify(result),{status:200});}});
 const id='11111111-1111-4111-8111-111111111111';
 const request=(body={sessionId:id},authorization='Bearer fixture',origin='https://app.invalid')=>new Request('https://app.invalid/api/member/video-call',{method:'POST',headers:{Authorization:authorization,Origin:origin,'Content-Type':'application/json'},body:JSON.stringify(body)});
 assert.equal((await route.POST(request())).status,200);assert.equal(calls.length,1);assert.equal(calls[0].url,'https://www.thesoundfitness.com/api/client-hub/call');assert.equal(calls[0].input.headers.Authorization,'Bearer fixture');assert.equal(calls[0].input.body,JSON.stringify({sessionId:id}));
 calls=[];assert.equal((await route.POST(request({},''))).status,401);assert.equal((await route.POST(request({sessionId:id},'Bearer fixture','https://foreign.invalid'))).status,403);assert.equal((await route.POST(request({sessionId:id,memberId:'someone-else'}))).status,400);assert.equal(calls.length,0);
 result={url:'https://foreign.invalid/room',token:'fixture'};assert.equal((await route.POST(request())).status,502);
 result={notified:true};assert.equal((await route.PATCH(new Request(request(),{method:'PATCH'}))).status,200);
});
test('closing a pending join prevents room creation and leaving releases the video frame',async()=>{
 const source=fs.readFileSync('components/dashboard/SessionVideoCall.tsx','utf8'),ast=ts.createSourceFile('call.tsx',source,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);
 const node=ast.statements.find(n=>ts.isFunctionDeclaration(n)&&n.name?.text==='AccountVideoCall');
 const functionSource=node.getText(ast).replace('  const windowIssue = videoCallWindow(startsAt, now);','  exports.actions = { join, close };\n  const windowIssue = videoCallWindow(startsAt, now);');
 let resolveAuth,fetches=0,created=0,destroyed=0,refs=0;
 let auth=()=>new Promise(resolve=>{resolveAuth=resolve;});
 const instance={on(){},join:async()=>{},destroy:async()=>{destroyed++;}};
 const environment={exports:{},require:name=>name==='@daily-co/daily-js'?{default:{createFrame:()=>{created++;return instance;}}}:require(name),
  useRef:value=>({current:refs++===0?{}:value}),useState:initial=>[typeof initial==='function'?initial():initial,()=>{}],useCallback:fn=>fn,useEffect:()=>{},
  planningOwner:()=> 'member',planningAccountGeneration:()=>1,videoCallWindow:()=>'',supabase:{auth:{getSession:()=>auth()}},
  fetch:async()=>{fetches++;return new Response(JSON.stringify({url:'https://sound.daily.co/sf-fixture',token:'fixture'}));},AbortSignal,Date};
 vm.runInNewContext(ts.transpileModule(functionSource+';exports.render=AccountVideoCall;',{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX}}).outputText,environment);
 environment.exports.render({sessionId:'fixture',startsAt:'2026-11-10',account:'member',generation:1});
 const pending=environment.exports.actions.join();environment.exports.actions.close();resolveAuth({data:{session:{user:{id:'member'},access_token:'fixture'}}});await pending;assert.equal(fetches,0);assert.equal(created,0);
 auth=async()=>({data:{session:{user:{id:'member'},access_token:'fixture'}}});await environment.exports.actions.join();assert.equal(created,1);environment.exports.actions.close();assert.equal(destroyed,1);
});
