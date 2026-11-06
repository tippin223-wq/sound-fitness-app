import { createClient } from "@supabase/supabase-js";
import { revalidateTag } from "next/cache";
import { NextResponse } from "next/server";
export async function POST(request:Request){
 const token=request.headers.get('authorization')?.match(/^Bearer (\S+)$/i)?.[1];
 const url=process.env.NEXT_PUBLIC_SUPABASE_URL,key=process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
 const headers={'Cache-Control':'private, no-store'};
 if(!token||!url||!key)return NextResponse.json({error:'Admin sign-in required'},{status:401,headers});
 const db=createClient(url,key,{auth:{persistSession:false},global:{headers:{Authorization:`Bearer ${token}`}}});
 try{
  const body=await request.json();
  if(typeof body.id!=='string'||!Number.isSafeInteger(body.revision))return NextResponse.json({error:'Invalid publication request'},{status:400,headers});
  const {data,error}=await db.rpc('publish_app_content',{p_id:body.id,p_revision:body.revision});
  if(error)return NextResponse.json({error:error.message},{status:400,headers});
  revalidateTag(`content-${data.bank}`,{expire:0});
  return NextResponse.json({revision:data.revision,bank:data.bank},{headers});
 }catch{return NextResponse.json({error:'Content could not be published'},{status:503,headers});}
}
