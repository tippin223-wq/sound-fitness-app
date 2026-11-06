"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import type { SharedProgram } from "./types";

type Progress = { program: SharedProgram | null; level: number | null; points: number;
  completedIds: string[]; startDate: string | null; issue: string | null };
const empty: Progress = {program:null,level:null,points:0,completedIds:[],startDate:null,issue:null};
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
      const {data:enrollment,error}=await supabase.from("fitness_program_enrollments")
        .select("id,program_id,version,start_date").eq("profile_id",auth.user.id).eq("status","active").maybeSingle();
      if(disposed||ticket!==generation)return;
      if(error){setState({...empty,issue:"Your program could not be loaded."});return;}
      if(!enrollment)return;
      const [catalog,credits]=await Promise.all([
        supabase.from("fitness_program_versions").select("definition").eq("program_id",enrollment.program_id).eq("version",enrollment.version).single(),
        supabase.from("fitness_program_activity_credits").select("activity_id,points").eq("enrollment_id",enrollment.id),
      ]);
      if(disposed||ticket!==generation)return;
      if(catalog.error||credits.error){setState({...empty,issue:"Your program progress could not be loaded."});return;}
      const program=catalog.data.definition as SharedProgram;
      const points=(credits.data||[]).reduce((sum,c)=>sum+c.points,0);
      if(!Number.isSafeInteger(points)||points<0||points>program.totalLevels*100){setState({...empty,issue:"Your saved progress needs review."});return;}
      setState({program,points,level:Math.floor(points/100),completedIds:(credits.data||[]).map(c=>c.activity_id),startDate:enrollment.start_date,issue:null});
    }
    void refresh();
    // Account changes invalidate pending responses before any new account data can render.
    const {data:{subscription}}=supabase.auth.onAuthStateChange((event)=>{if(event==="TOKEN_REFRESHED")return;generation++;setState(empty);queueMicrotask(()=>{if(!disposed)void refresh();});});
    window.addEventListener("fitness-program-updated",refresh);
    return ()=>{disposed=true;generation++;subscription.unsubscribe();window.removeEventListener("fitness-program-updated",refresh);};
  },[enabled]);
  return state;
}
