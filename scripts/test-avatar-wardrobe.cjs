const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const ts=require('typescript');
const source=fs.readFileSync('components/dashboard/BodyCommandCenterCard.tsx','utf8');
const ast=ts.createSourceFile('card.tsx',source,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);
const declarations=[];
for(const node of ast.statements){
 if(ts.isFunctionDeclaration(node)&&['AvatarLabMenu','AvatarLabChoice'].includes(node.name?.text))declarations.push(node.getText(ast));
 if(ts.isVariableStatement(node)&&node.declarationList.declarations.some(d=>d.name.getText(ast)==='avatarShirtUnlockCosts'))declarations.push(node.getText(ast));
}
const palette={exports:{}};
new Function('exports',ts.transpileModule(fs.readFileSync('components/dashboard/soundFitnessAvatarAppearance.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText)(palette.exports);
function harness(){
 let values=['outfit',null],index=0;const changes=[];
 const appearance={...palette.exports.defaultSoundFitnessAvatarAppearance};
 const env={exports:{},require,useState:initial=>{const i=index++;return [values[i]??initial,v=>{values[i]=v;}];},useId:()=> 'lab',createPortal:x=>x,
  layoutStyles:{avatarEnvironment:'environment'},SoundFitnessAvatar3D:'avatar',AvatarLabOptionRail:'rail',AvatarClothingColors:'colors',
  avatarLabTabs:[{id:'outfit',label:'Outfit',icon:'icon'}],avatarShirtOptions:Object.entries(palette.exports.soundFitnessAvatarShirtPalettes).map(([id,x])=>({id,label:x.label})),
  avatarPantsOptions:[],avatarShoeOptions:[],Element:class{closest(){return null;}},document:{body:{}},...Object.fromEntries(['Sparkles','X','Shirt','Check','LockKeyhole','RotateCcw','Link','ExternalLink'].map(x=>[x,'icon']))};
 const code=ts.transpileModule(declarations.join('\n')+'\nexports.api={Menu:AvatarLabMenu,Choice:AvatarLabChoice,costs:avatarShirtUnlockCosts};',{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX,target:ts.ScriptTarget.ES2022}}).outputText;
 new Function(...Object.keys(env),code)(...Object.values(env));
 const props={appearance,backgroundImage:'',bodyMapHref:'/body',emotePreset:'wave',onAppearanceChange:x=>changes.push(x),onClose:()=>{},onEmoteChange:()=>{},onReset:()=>{}};
 const render=()=>{index=0;return env.exports.api.Menu(props);};
 const nodes=(node,result=[])=>{if(Array.isArray(node))node.forEach(n=>nodes(n,result));else if(node&&typeof node==='object'&&node.props){result.push(node);nodes(node.props.children,result);}return result;};
 const find=(tree,predicate)=>nodes(tree).find(predicate);
 return {render,find,changes,appearance,api:env.exports.api,env};
}
test('about sixty percent of shirt designs have clear preview-only Sapphire pricing',()=>{
 const h=harness(),tree=h.render(),costs=h.api.costs;
 assert.equal(Object.keys(costs).length,7);assert.equal(Object.keys(palette.exports.soundFitnessAvatarShirtPalettes).length,12);
 const item=h.find(tree,n=>n.type===h.api.Choice&&n.props.previewItem==='waves');
 const button=h.api.Choice(item.props);
 assert.match(button.props['aria-label'],/Locked.*5 Sapphires.*Preview only/);assert.match(button.props.children[0].props.className,/opacity-50/);
});
test('locked try-on changes only the Lab preview and click-away restores the saved outfit',()=>{
 const h=harness(),original={...h.appearance};let tree=h.render();
 h.find(tree,n=>n.type===h.api.Choice&&n.props.previewItem==='waves').props.onClick();tree=h.render();
 assert.equal(h.find(tree,n=>n.type==='avatar').props.appearance.shirt,'waves');assert.equal(h.changes.length,0);assert.deepEqual(h.appearance,original);
 tree.props.onPointerDownCapture({target:new h.env.Element()});tree=h.render();
 assert.equal(h.find(tree,n=>n.type==='avatar').props.appearance.shirt,original.shirt);assert.equal(h.changes.length,0);
});
test('color edits and free selections never persist the locked preview',()=>{
 const h=harness();let tree=h.render();
 h.find(tree,n=>n.type===h.api.Choice&&n.props.previewItem==='energy').props.onClick();tree=h.render();
 h.find(tree,n=>n.type==='colors'&&n.props.label==='Shirt Color').props.onChange('forest');
 assert.equal(h.changes[0].shirt,h.appearance.shirt);assert.equal(h.changes[0].shirtColor,'forest');
 tree=h.render();h.find(tree,n=>n.type===h.api.Choice&&n.props.previewItem==='storm').props.onClick();
 assert.equal(h.changes[1].shirt,'storm');assert.equal(h.find(h.render(),n=>n.type==='avatar').props.appearance.shirt,h.appearance.shirt);
});

