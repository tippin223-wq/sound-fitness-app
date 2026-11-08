const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const crypto=require('node:crypto');
const ts=require('typescript');
const root=path.resolve(__dirname,'..'),cache=new Map();
function load(file){
 file=path.resolve(root,file);if(cache.has(file))return cache.get(file);
 if(file.endsWith('.json'))return JSON.parse(fs.readFileSync(file,'utf8'));
 const m={exports:{}};cache.set(file,m.exports);
 const code=ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,esModuleInterop:true,target:ts.ScriptTarget.ES2022}}).outputText;
 const localRequire=name=>name.startsWith('@/')?load(name.slice(2)+'.ts'):name.startsWith('.')?load(path.resolve(path.dirname(file),name)+(path.extname(name)?'':'.ts')):require(name);
 new Function('require','module','exports',code)(localRequire,m,m.exports);cache.set(file,m.exports);return m.exports;
}
test('all six editorial topics have ten distinct stories and unique local photos',()=>{
 const {getDashboardNewsFeed}=load('lib/localData/dashboardNewsFeed.ts');
 const items=getDashboardNewsFeed().items,counts={};
 assert.equal(items.length,60);
 const photoHashes=[];
 for(const item of items){
  counts[item.topic]=(counts[item.topic]||0)+1;
  assert(item.imageAlt?.trim());assert(item.sourceUrl.startsWith('https://'));
  photoHashes.push(crypto.createHash('sha256').update(fs.readFileSync(path.join(root,'public',item.image))).digest('hex'));
  if(item.image.startsWith('/news/articles/')){
   assert(item.photoCredit?.author);assert(item.photoCredit?.license);
   assert(item.photoCredit.sourceUrl.startsWith('https://'));assert(item.photoCredit.licenseUrl.startsWith('https://'));
  }
 }
 assert.equal(new Set(items.map(x=>x.id)).size,60);
 assert.equal(new Set(items.map(x=>x.title)).size,60);
 assert.equal(new Set(items.map(x=>x.image)).size,60);
 assert.equal(new Set(photoHashes).size,60);
 assert.deepEqual(counts,{training:10,nutrition:10,recovery:10,gear:10,sports:10,community:10});
});
test('publishing a revised seed preserves discussion identity and safely carries the article body and credits',()=>{
 const {getDashboardNewsFeed}=load('lib/localData/dashboardNewsFeed.ts');
 const {mergePublishedNews}=load('lib/localData/publishedNews.ts');
 const seed=getDashboardNewsFeed(),original=seed.items.find(x=>x.photoCredit);
 const merged=mergePublishedNews(seed,[{id:'draft-id',bank:'news',source_key:'custom:draft-id',title:original.title,summary:'Updated summary',revision:2,fields:{Kind:'world',Topic:original.topic,'Image URL':original.image,'Published at':original.publishedAt,'Article text':'First paragraph.\n\nSecond paragraph.','Photo credit':original.photoCredit.author,'Photo source URL':original.photoCredit.sourceUrl,'Photo license':original.photoCredit.license,'Photo license URL':original.photoCredit.licenseUrl}}]);
 assert.equal(merged.items.length,60);
 const article=merged.items.find(x=>x.title===original.title);
 assert.equal(article.id,original.id);assert.equal(article.summary,'Updated summary');
 assert.equal(article.body,'First paragraph.\n\nSecond paragraph.');assert.deepEqual(article.photoCredit,original.photoCredit);
});
