// Read-only by default. --apply imports absent source identities; never overwrites admin edits.
const fs=require('node:fs'),path=require('node:path'),ts=require('typescript'),zlib=require('node:zlib');
const root=path.resolve(__dirname,'..');
const website=process.argv.find(v=>v.startsWith('--website='))?.slice(10);
const cache=new Map();
function load(file){file=path.resolve(root,file);if(cache.has(file))return cache.get(file);if(file.endsWith('.json'))return JSON.parse(fs.readFileSync(file,'utf8'));const m={exports:{}};cache.set(file,m.exports);
 const code=ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true}}).outputText;
 const localRequire=name=>{if(name.startsWith('@/'))return load(name.slice(2)+'.ts');if(name.startsWith('.'))return load(path.resolve(path.dirname(file),name)+(path.extname(name)?'':'.ts'));return require(name);};
 new Function('require','module','exports',code)(localRequire,m,m.exports);cache.set(file,m.exports);return m.exports;}
function literal(file,name){const text=fs.readFileSync(path.resolve(root,file),'utf8');const ast=ts.createSourceFile(file,text,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);let found;function walk(n){if(ts.isVariableDeclaration(n)&&n.name.getText(ast)===name&&n.initializer)found=n.initializer.getText(ast);ts.forEachChild(n,walk);}walk(ast);if(!found)throw Error('Missing source '+name);
 const code=ts.transpileModule('module.exports='+found.replace(/\bicon:\s*[A-Za-z][A-Za-z0-9]*/g,'icon: null'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
 const m={exports:{}};new Function('module',code)(m);return m.exports;}
const records=[];
function add(bank,source_key,title,summary,fields){records.push({bank,source_key,title,summary:summary||'',fields:Object.fromEntries(Object.entries(fields).map(([k,v])=>[k,typeof v==='string'?v:JSON.stringify(v)]))});}
for(const item of load('lib/localData/dashboardNewsFeed.ts').getDashboardNewsFeed().items)add('news',item.id,item.title,item.summary,{Kind:item.kind,Topic:item.topic,'Image URL':item.image,'Image description':item.imageAlt,'Photo credit':item.photoCredit?.author||'','Photo source URL':item.photoCredit?.sourceUrl||'','Photo license':item.photoCredit?.license||'','Photo license URL':item.photoCredit?.licenseUrl||'','Published at':item.publishedAt,Source:item.source||'','Source URL':item.sourceUrl||'','Link URL':item.href||'','Link label':item.hrefLabel||'','Starts at':item.event?.startsAt||'','Ends at':item.event?.endsAt||'',Location:item.event?.location||'',Price:item.event?.price||'',Capacity:item.event?.capacity===undefined?'':String(item.event.capacity),'Spots left':item.event?.spotsLeft===undefined?'':String(item.event.spotsLeft)});
const quotes=[['Ronnie Coleman',`Ain't nothing to it but to do it.`],['Muhammad Ali',`Don't count the days, make the days count.`],['Arnold Schwarzenegger',`"The last three or four reps" are where growth gets earned.`]];
quotes.forEach(([author,message],i)=>add('chyron',`quote:${i}`,author,message,{Message:message,Author:author,Type:'quote'}));
['progressive overload can be load, reps, sets, control, range, or rest.','creatine helps recycle ATP for repeated high-output efforts.','soreness is not the scoreboard; performance and recovery trends matter more.'].forEach((message,i)=>add('chyron',`trivia:${i}`,`Training fact ${i+1}`,message,{Message:message,Type:'trivia'}));
const {challengeSets}=load('lib/planning/challengeSets.ts');
for(const [category,sets]of Object.entries(challengeSets))sets.forEach((set,index)=>set.challenges.forEach((c,slot)=>add('challenges',`${category}:${index}:${slot}`,c.label,set.name,{Category:category,Difficulty:set.name,Target:c.target,'Completion rule':c.metric,'Reward reference':'',Link:c.href})));
for(const p of JSON.parse(fs.readFileSync(path.join(root,'lib/programs/catalog.v1.json'),'utf8')))add('plans',p.id,p.title,p.goal,{Domain:p.category,Goal:p.goal,'Duration in weeks':p.weeks,'Catalog reference':`${p.id}@${p.version}`,'Program JSON':p});
const normalized=load('lib/training/normalizedExerciseCatalog.ts');
const exercises=[...new Map([...load('lib/training/exerciseLibrary.ts').exerciseLibrary,...normalized.getExerciseCatalogWithLegacyFallback()].map(e=>[e.id,e])).values()];
for(const e of exercises)add('exercises',e.id,e.name,e.cue,{Category:e.body,'Muscle groups':e.muscles,Equipment:e.equipment,Instructions:e.cue,'Image URL':e.image,'Video URL':'',Pattern:e.pattern,Level:e.level});
if(website){for(const e of load(path.join(website,'src/lib/exercise-library.ts')).EXERCISE_LIBRARY)if(!records.some(r=>r.bank==='exercises'&&r.source_key===e.id))add('exercises',e.id,e.name,e.cue,{Category:e.pattern,Equipment:e.equipment,Instructions:e.cue,Pattern:e.pattern,Level:e.level});}
const appearance=load('components/dashboard/soundFitnessAvatarAppearance.ts');
for(const [kind,exportName] of [['shirt','soundFitnessAvatarShirtPalettes'],['pants','soundFitnessAvatarPantsPalettes'],['shoes','soundFitnessAvatarShoesPalettes'],['gear','soundFitnessAvatarGear'],['hair','soundFitnessAvatarHairStyles'],['emote','soundFitnessAvatarEmotes']])for(const [id,value]of Object.entries(appearance[exportName]))add('avatar',`${kind}:${id}`,value.label,'',{'Item type':kind,Style:id,Colors:value.base||'', 'Asset URL':kind==='shirt'&&!['sound','storm'].includes(id)?`/models/textures/shirts/${id}.png`:'','Sapphire unlock cost':kind==='shirt'?({waves:5,orbit:8,echo:10,waterline:12,mountain:15,trainer:20,energy:25}[id]||0):0,'Coin price':''});
for(const theme of load('lib/calendar-themes.ts').CALENDAR_THEMES)add('themes',`calendar:${theme.id}`,theme.label,'',{Surface:'calendar','Asset URL':theme.src,Accent:theme.accent,Today:theme.today});
for(const scene of literal('components/dashboard/BodyCommandCenterCard.tsx','avatarSceneOptions'))add('themes',`avatar:${scene.id}`,scene.label,'',{Surface:'avatar','Asset URL':scene.image,Accent:scene.accent});
for(const recipe of literal('app/dashboard/nutrition/recipes/page.tsx','recipes'))add('nutrition',recipe.name.toLowerCase().replace(/[^a-z0-9]+/g,'-'),recipe.name,`${recipe.category} · ${recipe.time}`,{Category:recipe.category,Nutrition:`Protein ${recipe.protein}`,'Diet tags':recipe.tag,'Prep time':recipe.time,Ingredients:'',Instructions:''});
for(const lesson of literal('app/learning/page.tsx','recommendedLessons'))add('education',lesson.title.toLowerCase().replace(/[^a-z0-9]+/g,'-'),lesson.title,lesson.detail,{Course:'Member fundamentals','Lesson content':lesson.detail,Duration:lesson.minutes});
const {WEEKLY_REWARDS,REWARD_RARITIES,weeklyRewardAward}=load('lib/weeklyRewardRarity.ts');
WEEKLY_REWARDS.forEach((reward,index)=>REWARD_RARITIES.forEach((rarity,tier)=>{if(tier<reward.minimum||('maximum'in reward&&tier>reward.maximum))return;const award=weeklyRewardAward(index,tier);const amounts=reward.id==='sound-points'?[25,50,100,200,500]:reward.id==='recovery-credit'?[1,2,3,5,10]:reward.id==='emerald'?[0,0,1,2,5]:null;add('rewards',`weekly:${reward.id}:${tier}`,`${reward.label} · ${rarity.label}`,award.detail,{'Reward type':reward.id,Rarity:rarity.id,Amount:amounts?String(amounts[tier]):'1','Display amount':award.amount,'Item reference':reward.id});}));
async function main(){
 const totals=Object.fromEntries([...new Set(records.map(r=>r.bank))].map(bank=>[bank,records.filter(r=>r.bank===bank).length]));
 console.log(JSON.stringify({records:records.length,banks:totals,rawBytes:Buffer.byteLength(JSON.stringify(records)),gzipBytes:zlib.gzipSync(JSON.stringify(records)).length}));
 if(!process.argv.includes('--apply'))return;
 if(!website||!process.env.DATABASE_URL)throw Error('Shared database configuration missing');
 const sql=require(path.join(website,'node_modules/postgres'))(process.env.DATABASE_URL,{max:1,ssl:'require',connect_timeout:15,onnotice:()=>{}});
 try{await sql.begin(async tx=>{
  const existing=await tx.unsafe("select to_regclass('public.app_content_publications') is not null as installed");
  if(!existing[0].installed)await tx.unsafe(fs.readFileSync(path.join(root,'supabase/migrations/20261104160000_content_publications.sql'),'utf8'));
  let inserted=0;
  for(const r of records){const row=await tx`insert into app_content_drafts(bank,source_key,title,summary,fields) values(${r.bank},${r.source_key},${r.title},${r.summary},${tx.json(r.fields)}) on conflict(bank,source_key) where source_key is not null do nothing returning *`;
   if(!row.length)continue;inserted++;
   // Baseline snapshot only for newly imported records; no live content or existing edits are replaced.
   const d=row[0];await tx`insert into app_content_publications(id,bank,source_key,title,summary,fields,revision) values(${d.id},${d.bank},${d.source_key},${d.title},${d.summary},${tx.json(d.fields)},${d.revision})`;
   await tx`insert into app_content_history(entry_id,revision,snapshot) select id,revision,to_jsonb(p) from app_content_publications p where id=${d.id}`;
  }
  console.log(`Imported ${inserted} absent source entries; existing drafts preserved.`);
 });}finally{await sql.end();}
}
main().catch(()=>{console.error('Content import failed; transaction rolled back.');process.exitCode=1;});
