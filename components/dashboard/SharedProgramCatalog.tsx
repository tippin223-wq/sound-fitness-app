"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import type { SharedProgram } from "@/lib/programs/types";

export default function SharedProgramCatalog() {
  const [programs,setPrograms]=useState<Array<{program_id:string;version:number;title:string;weeks:number;totalLevels:number;status:string}>>([]);
  const [plan,setPlan]=useState<SharedProgram|null>(null);
  const [selected,setSelected]=useState<string>("");
  const [message,setMessage]=useState("Loading shared plans…");
  useEffect(()=>{
    let active=true;
    void supabase.from("fitness_program_versions").select("program_id,version,title:definition->>title,weeks:definition->weeks,totalLevels:definition->totalLevels,status:definition->>status").order("program_id").then(({data,error})=>{
      if(!active)return;
      if(error){setMessage("Shared plans could not be loaded. Your saved plan has not changed.");return;}
      const latest=new Map<string,(typeof programs)[number]>();
      for(const row of data||[]){const p=row as unknown as (typeof programs)[number];if(!latest.has(p.program_id)||latest.get(p.program_id)!.version<p.version)latest.set(p.program_id,p);}
      setPrograms([...latest.values()]);setMessage(data?.length?"":"No shared plans published yet.");
    });
    return ()=>{active=false;};
  },[]);
  const version=programs.find(p=>p.program_id===selected)?.version;
  useEffect(()=>{
    let active=true;
    if(!selected||!version)return;
    void supabase.from("fitness_program_versions").select("definition").eq("program_id",selected).eq("version",version).single().then(({data,error})=>{
      if(!active)return;
      if(error){setMessage("This program could not be loaded.");return;}
      setPlan(data.definition as SharedProgram);setMessage("");
    });
    return()=>{active=false;};
  },[selected,version]);
  return <section className="rounded-3xl border border-cyan-300/20 bg-slate-950/70 p-5 text-white" aria-label="Shared training and nutrition plans">
    <h2 className="text-xl font-bold">Training & nutrition programs</h2>
    <p className="mt-2 text-sm text-slate-400">One catalog shared with the website. Preview a program’s schedule, levels and rewards.</p>
    {message&&<p role="status" className="mt-3 text-sm">{message}</p>}
    <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">{programs.map(p=><button key={p.program_id} type="button" aria-pressed={selected===p.program_id} onClick={()=>{if(selected===p.program_id)return;setPlan(null);setMessage("Loading program…");setSelected(p.program_id);}} className={`rounded-xl border p-3 text-left ${selected===p.program_id?"border-cyan-300 bg-cyan-950/50":"border-white/10 bg-white/5"}`}>
      <span className="block font-semibold">{p.title}</span><span className="text-xs text-slate-300">{p.weeks} weeks · {p.totalLevels} levels · {p.status==="review"?"In review":"Available"}</span>
    </button>)}</div>
    {plan&&<div className="mt-5 space-y-3 border-t border-white/10 pt-4">
      <h3 className="text-lg font-bold">{plan.title}</h3><p>{plan.goal}</p><p className="text-sm text-slate-400">{plan.audience}</p>
      <p className="text-sm">{plan.activities.length} scheduled activities · 100 points per level · one reward each level · unique cosmetic every fifth level</p>
      {plan.dietaryPreferences.length>0&&<p className="text-sm">Diet options: {plan.dietaryPreferences.join(", ")}. {plan.nutritionPolicy}</p>}
      <details><summary className="cursor-pointer text-cyan-200">Schedule & signals</summary><ol className="mt-3 max-h-96 space-y-3 overflow-y-auto">{plan.activities.map(a=><li key={a.id} className="rounded-xl bg-white/5 p-3"><b>Week {a.week} · Day {a.day} — {a.title}</b><p className="mt-1 text-sm">{a.prescription}</p>{a.exercises?.map(e=><p key={e.name} className="text-sm text-slate-300">{e.name} · {e.sets} × {e.reps} · {e.restSeconds}s rest</p>)}<p className="mt-2 text-xs text-cyan-200">{a.signal.action} · {a.points} progress points</p></li>)}</ol></details>
      <details><summary className="cursor-pointer text-cyan-200">Level rewards</summary><ol className="mt-3 grid max-h-72 grid-cols-2 gap-2 overflow-y-auto sm:grid-cols-3">{plan.rewards.map(r=><li key={r.id} className="rounded-xl bg-white/5 p-3 text-sm">Level {r.level}<br/>{r.kind==="currency"?`${r.amount} ${r.asset}`:r.name}{r.fulfillment==="design"&&<span className="block text-xs text-amber-200">Asset in design</span>}</li>)}</ol></details>
      {plan.status==="review"&&<p className="text-sm text-amber-200">Preview only while the program and milestone assets are reviewed. Your current plan and progress stay unchanged.</p>}
    </div>}
  </section>;
}
