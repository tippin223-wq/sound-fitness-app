// Run with the website's --env-file=.env.local and its installed postgres module.
// Default is read-only. --apply installs the scoped migration and inserts absent
// immutable versions in a single transaction. It never edits existing versions.
const fs=require('node:fs');
const path=require('node:path');
const crypto=require('node:crypto');
async function main(){
  const modulePath=process.argv.find(a=>a.startsWith('--postgres='))?.slice(11);
  if(!modulePath||!process.env.DATABASE_URL)throw Error('Shared database configuration missing');
  const postgres=require(modulePath);
  const sql=postgres(process.env.DATABASE_URL,{max:1,connect_timeout:15,ssl:'require',onnotice:()=>{}});
  try{
    const catalog=JSON.parse(fs.readFileSync(path.resolve(__dirname,'../lib/programs/catalog.v1.json'),'utf8'));
    const prerequisite=await sql`select to_regclass('public.profiles') is not null as ready`;
    if(!prerequisite[0].ready)throw Error('Unexpected database: profiles missing');
    const exists=await sql`select to_regclass('public.fitness_program_versions') is not null as ready`;
    if(process.argv.includes('--apply')){
      const migration=fs.readFileSync(path.resolve(__dirname,'../supabase/migrations/20261104120000_shared_program_catalog.sql'),'utf8');
      await sql.begin(async tx=>{
        if(!exists[0].ready)await tx.unsafe(migration.replace(/^begin;\s*$/m,'').replace(/^commit;\s*$/m,''));
        for(const program of catalog){
          const rows=await tx`select definition from public.fitness_program_versions where program_id=${program.id} and version=${program.version}`;
          if(rows.length){
            const canonical=v=>JSON.stringify(v,(_,x)=>x&&typeof x==='object'&&!Array.isArray(x)?Object.fromEntries(Object.entries(x).sort(([a],[b])=>a.localeCompare(b))):x);
            if(canonical(rows[0].definition)!==canonical(program))throw Error('Existing immutable version differs; create a new version');
          }else await tx`insert into public.fitness_program_versions(program_id,version,definition) values(${program.id},${program.version},${tx.json(program)})`;
        }
      });
    }
    const state=await sql`select to_regclass('public.fitness_program_versions') is not null as ready`;
    if(!state[0].ready){console.log('Shared database verified; catalog migration not installed.');return;}
    const counts=await sql`select count(*)::integer as plans,sum(jsonb_array_length(definition->'activities'))::integer as activities,sum(jsonb_array_length(definition->'rewards'))::integer as rewards from public.fitness_program_versions`;
    console.log(JSON.stringify({database:counts[0],catalogSha256:crypto.createHash('sha256').update(JSON.stringify(catalog)).digest('hex')}));
  }finally{await sql.end();}
}
main().catch(error=>{console.error(error.code?`Shared catalog operation failed (${error.code}).`:error.message?.startsWith('Existing')?error.message:'Shared catalog operation failed; no credentials or connection details logged.');process.exitCode=1;});
