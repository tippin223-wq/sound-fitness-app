"use client";
import { useEffect, useRef, useState } from "react";
import { fetchPublishedContent } from "@/lib/usePublishedContent";
import type { PublishedContent } from "@/lib/contentPublished";

export default function PublishedContentBank({bank,title}:{bank:string;title:string}){
 const detailRequest=useRef(0);
 const [items,setItems]=useState<PublishedContent[]>([]),[page,setPage]=useState(0),[selected,setSelected]=useState<PublishedContent|null>(null),[error,setError]=useState("");
 useEffect(()=>{let active=true;void fetchPublishedContent(bank,undefined,page).then(rows=>{if(active){setItems(rows);setError("");}}).catch(()=>{if(active)setError("The library could not be loaded.");});return()=>{active=false;detailRequest.current++;};},[bank,page]);
 async function open(item:PublishedContent){const ticket=++detailRequest.current;setSelected(null);setError("");try{const rows=await fetchPublishedContent(bank,item.source_key);if(ticket===detailRequest.current)setSelected(rows[0]??null);}catch{if(ticket===detailRequest.current)setError("This entry could not be loaded.");}}
 return <section className="rounded-3xl border border-cyan-300/20 bg-slate-950/70 p-5 text-white" aria-label={title}>
  <h2 className="text-xl font-bold">{title}</h2><p role="status" className="text-sm text-amber-200">{error}</p>
  <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">{items.map(item=><button type="button" className="rounded-xl border border-white/15 bg-white/5 p-3 text-left hover:border-cyan-300" key={item.id} onClick={()=>void open(item)}><strong>{item.title}</strong><p className="mt-1 text-sm text-slate-300">{item.summary}</p></button>)}</div>
  {selected&&<article className="mt-4 rounded-xl border border-cyan-300/30 p-4"><button type="button" className="float-right p-2" aria-label="Close entry" onClick={()=>{detailRequest.current++;setSelected(null);}}>×</button><h3 className="font-bold">{selected.title}</h3><p>{selected.summary}</p><dl className="mt-3 space-y-3">{Object.entries(selected.fields??{}).filter(([key,value])=>value&&!['Program JSON','Catalog reference'].includes(key)).map(([key,value])=><div key={key}><dt className="text-xs font-semibold text-cyan-200">{key}</dt><dd className="whitespace-pre-wrap break-words text-sm">{value}</dd></div>)}</dl></article>}
  {selected?.fields?.["Program JSON"]&&<ProgramDetails json={selected.fields["Program JSON"]} />}
  <div className="mt-4 flex items-center gap-4"><button disabled={page===0} onClick={()=>{setSelected(null);setPage(p=>p-1);}}>Previous</button><span className="text-xs">Page {page+1}</span><button disabled={items.length<(['chyron','avatar','themes','challenges','rewards'].includes(bank)?400:40)} onClick={()=>{setSelected(null);setPage(p=>p+1);}}>Next</button></div>
 </section>;
}

function ProgramDetails({json}:{json:string}){
 let plan:{activities?:Array<{id:string;week:number;day:number;title:string;prescription:string;signal?:{action:string}}>;rewards?:Array<{id:string;level:number;name:string;asset:string;amount:number;kind:string}>};
 try{plan=JSON.parse(json);}catch{return null;}
 return <div className="mt-4 space-y-4"><p className="text-sm text-amber-200">Program preview. Enrollment opens after the program and its reward assets are reviewed.</p><details><summary>Schedule & signals</summary><ol className="mt-3 max-h-96 space-y-3 overflow-y-auto">{plan.activities?.map(item=><li key={item.id}><strong>Week {item.week} · Day {item.day}: {item.title}</strong><p className="text-sm">{item.prescription}</p><p className="text-xs text-cyan-200">{item.signal?.action}</p></li>)}</ol></details><details><summary>Level rewards</summary><ol className="mt-3 max-h-64 space-y-2 overflow-y-auto">{plan.rewards?.map(item=><li key={item.id}>Level {item.level}: {item.kind==='currency'?`${item.amount} ${item.asset}`:item.name}</li>)}</ol></details></div>;
}
