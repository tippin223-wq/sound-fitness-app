"use client";
import {useState} from "react";
import PublishedContentBank from "./PublishedContentBank";
const banks=[['exercises','Exercises'],['nutrition','Meals & recipes'],['education','Lessons'],['plans','Programs'],['challenges','Challenges'],['rewards','Rewards'],['avatar','Avatar items'],['themes','Themes'],['chyron','Tips & quotes']];
export default function SharedContentLibrary(){
 const [active,setActive]=useState('exercises');
 return <div className="space-y-4"><nav className="flex gap-2 overflow-x-auto" aria-label="Shared content library">{banks.map(([bank,label])=><button key={bank} type="button" aria-pressed={active===bank} onClick={()=>setActive(bank)} className={`shrink-0 rounded-xl border px-4 py-2 text-sm ${active===bank?'border-cyan-200 bg-cyan-950 text-cyan-100':'border-white/15 text-slate-300'}`}>{label}</button>)}</nav><PublishedContentBank key={active} bank={active} title={banks.find(([bank])=>bank===active)![1]} /></div>;
}
