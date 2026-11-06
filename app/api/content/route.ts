import { NextResponse } from "next/server";
import { publishedBanks } from "@/lib/contentPublished";
import { createHash } from "node:crypto";

export async function GET(request: Request) {
 const params=new URL(request.url).searchParams;
 const bank=params.get("bank") ?? "";
 const source=params.get("source");
 const page=Math.min(100,Math.max(0,Math.floor(Number(params.get("page")))||0));
 if(!publishedBanks.includes(bank as typeof publishedBanks[number])) return NextResponse.json({error:"Unknown content bank"},{status:400});
 const url=process.env.NEXT_PUBLIC_SUPABASE_URL,key=process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
 if(!url||!key)return NextResponse.json({error:"Content unavailable"},{status:503});
 // Only small banks download full fields. Catalogs use 40 summaries + detail on demand.
 const full=source||['news','chyron','avatar','themes','challenges','rewards'].includes(bank);
 const query=new URLSearchParams({bank:`eq.${bank}`,select:`id,bank,source_key,title,summary,revision${full?',fields':''}`,order:'source_key.asc',limit:full?'400':'40',offset:String(page*(full?400:40))});
 if(source)query.set('source_key',`eq.${source}`);
 try {
  const response=await fetch(`${url}/rest/v1/app_content_publications?${query}`,{headers:{apikey:key},next:{revalidate:60,tags:[`content-${bank}`]}});
  if(!response.ok)throw Error();
  const body=await response.text();
  const etag='"'+createHash('sha256').update(body).digest('hex').slice(0,24)+'"';
  const headers={"Cache-Control":"public, max-age=60, s-maxage=60, stale-while-revalidate=60",ETag:etag};
  if(request.headers.get('if-none-match')===etag)return new Response(null,{status:304,headers});
  return new Response(body,{headers:{...headers,'Content-Type':'application/json'}});
 }catch{return NextResponse.json({error:"Content unavailable"},{status:503,headers:{'Cache-Control':'no-store'}});}
}
