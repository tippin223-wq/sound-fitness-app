"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import type { SharedProgram } from "./types";

export type ActiveProgramTimeline = { id: string; program: SharedProgram; startDate: string | null; completedIds: string[] };
type Progress = { activePlans: ActiveProgramTimeline[]; program: SharedProgram | null; level: number | null; points: number;
  completedIds: string[]; startDate: string | null; issue: string | null };
const empty: Progress = {activePlans:[],program:null,level:null,points:0,completedIds:[],startDate:null,issue:null};
export function useProgramProgress(enabled=true) {
  const [state,setState]=useState<Progress>(empty);
  useEffect(()=>{
    if(!enabled)return;
    let disposed=false,generation=0;
    async function refresh(){
      const ticket=++generation;
      setState(empty);
      const {data:auth,error:authError}=await supabase.auth.getUser();
      if(disposed||ticket!==generation||authError||!auth.user)return;
      const {data:enrollments,error}=await supabase.from("fitness_program_enrollments")
        .select("id,program_id,version,start_date").eq("profile_id",auth.user.id).eq("status","active").order("start_date",{ascending:false});
      if(disposed||ticket!==generation)return;
      if(error){setState({...empty,issue:"Your program could not be loaded."});return;}
      if(!enrollments?.length)return;
      const enrollment=enrollments[0];
      const [catalog,credits]=await Promise.all([
        supabase.from("fitness_program_versions").select("definition").in("program_id",enrollments.map(item=>item.program_id)).in("version",enrollments.map(item=>item.version)),
        supabase.from("fitness_program_activity_credits").select("enrollment_id,activity_id,points").in("enrollment_id",enrollments.map(item=>item.id)),
      ]);
      if(disposed||ticket!==generation)return;
      if(catalog.error||credits.error){setState({...empty,issue:"Your program progress could not be loaded."});return;}
      const activePlans: ActiveProgramTimeline[]=enrollments.flatMap(item=>{
        const definition=(catalog.data||[]).map(row=>row.definition as SharedProgram).find(program=>program.id===item.program_id&&program.version===item.version);
        return definition?[{id:item.id,program:definition,startDate:item.start_date,completedIds:(credits.data||[]).filter(credit=>credit.enrollment_id===item.id).map(credit=>credit.activity_id)}]:[];
      });
      const program=activePlans.find(item=>item.id===enrollment.id)?.program;
      if(!program){setState({...empty,issue:"Your program could not be loaded."});return;}
      const selectedCredits=(credits.data||[]).filter(credit=>credit.enrollment_id===enrollment.id);
      const points=selectedCredits.reduce((sum,c)=>sum+c.points,0);
      if(!Number.isSafeInteger(points)||points<0||points>program.totalLevels*100){setState({...empty,issue:"Your saved progress needs review."});return;}
      setState({activePlans,program,points,level:Math.floor(points/100),completedIds:selectedCredits.map(c=>c.activity_id),startDate:enrollment.start_date,issue:null});
    }
    void refresh();
    // Account changes invalidate pending responses before any new account data can render.
    const {data:{subscription}}=supabase.auth.onAuthStateChange((event)=>{if(event==="TOKEN_REFRESHED")return;generation++;setState(empty);queueMicrotask(()=>{if(!disposed)void refresh();});});
    window.addEventListener("fitness-program-updated",refresh);
    return ()=>{disposed=true;generation++;subscription.unsubscribe();window.removeEventListener("fitness-program-updated",refresh);};
  },[enabled]);
  return state;
}
