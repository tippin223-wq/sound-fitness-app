"use client";

import { useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { CONTENT_BANKS, type ContentEntry } from "@/lib/contentBanks";
import styles from "./AdminContentLibrary.module.css";

export default function AdminContentLibrary() {
  const [bank, setBank] = useState<string>("chyron");
  const [entries, setEntries] = useState<ContentEntry[]>([]);
  const [query, setQuery] = useState("");
  const [draft, setDraft] = useState<ContentEntry | null>(null);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [ready, setReady] = useState(false);
  const [counts,setCounts]=useState<Record<string,number>>({});
  const [page,setPage]=useState(0);
  const [publishing,setPublishing]=useState(false);
  const [published,setPublished]=useState<number|null>(null);
  const [baseline,setBaseline]=useState("");
  const [reload, setReload] = useState(0);
  const generation = useRef(0);
  const selected = CONTENT_BANKS.find(item => item.id === bank)!;
  useEffect(() => {
    const ticket = ++generation.current;
    let disposed = false;
    queueMicrotask(()=>{if(!disposed&&ticket===generation.current){setReady(false);setEntries([]);setDraft(null);setMessage("Loading content banks…");}});
    const auth = supabase.auth.onAuthStateChange((event) => { if (event === "INITIAL_SESSION" || event === "TOKEN_REFRESHED") return; if (!disposed) { generation.current++; setEntries([]); setDraft(null); setReady(false); setReload(value => value + 1); } });
    void (async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) { if (!disposed && ticket === generation.current) setMessage("Sign in with your admin account to manage content."); return; }
        const role = await supabase.from("profiles").select("role").eq("id", user.id).single();
        if (role.error || role.data?.role !== "admin") { if (!disposed && ticket === generation.current) setMessage("Admin access is required to manage content."); return; }
        const result = await supabase.from("app_content_drafts").select("id,bank,title,summary,revision,updated_at,source_key").eq("bank",bank).order("title").range(page*40,page*40+39);
        const totals=await supabase.rpc("app_content_bank_counts");
        if (disposed || ticket !== generation.current) return;
        if (result.error) { setMessage("Content storage could not be loaded. Your draft has not been changed."); return; }
        if(!totals.error)setCounts(Object.fromEntries(totals.data.map((r:{bank:string;drafts:number})=>[r.bank,Number(r.drafts)])));
        setEntries(result.data as ContentEntry[]); setReady(true); setMessage("");
      } catch { if (!disposed && ticket === generation.current) setMessage("Content storage could not be reached."); }
    })();
    return () => { disposed = true; auth.data.subscription.unsubscribe(); };
  }, [reload,bank,page]);
  async function save() {
    if (!draft || busy || publishing) return;
    const ticket = generation.current;
    setBusy(true); setMessage("");
    try {
      const result = await supabase.rpc("save_app_content_draft", { p_id: draft.id || null, p_bank: draft.bank, p_title: draft.title, p_summary: draft.summary, p_fields: draft.fields, p_revision: draft.revision });
      if (ticket !== generation.current) return;
      if (result.error) { setMessage(result.error.message.includes("draft changed") ? "This draft changed elsewhere. Reload before saving; copy your edits first." : "Draft was not saved. Check your admin session and try again."); return; }
      const saved = result.data as ContentEntry;
      setEntries(items => [saved, ...items.filter(item => item.id !== saved.id)]); setDraft(saved); setBaseline(JSON.stringify(saved)); setMessage("Draft saved to shared content storage.");
    } catch { if (ticket === generation.current) setMessage("Draft was not saved. Please try again."); }
    finally { setBusy(false); }
  }

  async function openDraft(id:string){
    const ticket=generation.current;setBusy(true);
    try{const result=await supabase.from("app_content_drafts").select("*").eq("id",id).single();
      const live=await supabase.from("app_content_publications").select("revision").eq("id",id).maybeSingle();
      if(ticket!==generation.current)return;
      if(result.error){setMessage("Draft could not be loaded.");return;}
      const item=result.data as ContentEntry;setBaseline(JSON.stringify(item));setDraft(item);setPublished(live.data?.revision??null);
    }catch{if(ticket===generation.current)setMessage("Draft could not be loaded.");}finally{setBusy(false);}
  }
  async function publish(){
    if(!draft||publishing)return;const ticket=generation.current;setPublishing(true);
    try{
      const {data:{session}}=await supabase.auth.getSession();
      const response=await fetch("/api/admin/content/publish",{method:"POST",headers:{"Content-Type":"application/json",Authorization:"Bearer "+(session?.access_token??"")},body:JSON.stringify({id:draft.id,revision:draft.revision})});
      const result=await response.json();if(ticket!==generation.current)return;
      if(!response.ok){setMessage(result.error??"Publishing failed. Your saved draft is preserved.");return;}
      setPublished(result.revision);setMessage("Published. App and website use the shared release; cached pages refresh on their next visit (allow a few minutes).");
    }catch{if(ticket===generation.current)setMessage("Publishing could not be verified. Reload before retrying.");}
    finally{setPublishing(false);}
  }

  function switchBank(id: string) {
    if (busy || publishing) return;
    if (draft && JSON.stringify(draft) !== baseline && !window.confirm("Discard unsaved draft changes?")) return;
    setBank(id); setPage(0); setDraft(null); setQuery(""); setMessage("");
  }
  return <section className={styles.library} aria-label="Content library">
    <p className={styles.notice}>Edit a draft, save, then publish to the shared app and website library. Cached screens pick up edits on their next visit. Plans publish a new review version; enrolled members keep their original schedule.</p>
    <div className={styles.layout}>
      <nav className={styles.banks} aria-label="Content banks">{[...new Set(CONTENT_BANKS.map(item => item.group))].map(group => <div key={group}><h3>{group}</h3>{CONTENT_BANKS.filter(item => item.group === group).map(item => <button key={item.id} aria-pressed={bank === item.id} onClick={() => switchBank(item.id)}>{item.name}<span>{counts[item.id] ?? 0}</span></button>)}</div>)}</nav>
      <div className={styles.main}>
        <header><div><h3>{selected.name}</h3><p>{selected.description}</p></div><button disabled={!ready || busy || Boolean(draft)} onClick={() => { setBaseline("");setPublished(null);setDraft({ id: "", bank: selected.id, title: "", summary: "", fields: {}, revision: 0, updated_at: "" }); }}>+ New draft</button></header>
        {draft ? <form onSubmit={event => { event.preventDefault(); void save(); }} className={styles.editor}>
          <label>Title<input required maxLength={160} value={draft.title} disabled={busy || publishing} onChange={event => setDraft({ ...draft, title: event.target.value })} /></label>
          <label>Summary<textarea maxLength={2000} value={draft.summary} disabled={busy || publishing} onChange={event => setDraft({ ...draft, summary: event.target.value })} /></label>
          {[...new Set([...selected.fields,...Object.keys(draft.fields)])].map(field => <label key={field}>{field}<textarea maxLength={field === "Program JSON" ? 450000 : 10000} disabled={busy || publishing} value={draft.fields[field] ?? ""} onChange={event => setDraft({ ...draft, fields: { ...draft.fields, [field]: event.target.value } })} /></label>)}
          <footer><button type="submit" disabled={busy || !draft.title.trim()}>{busy ? "Saving…" : "Save draft"}</button><button type="button" disabled={busy} onClick={() => { if (window.confirm("Close editor? Unsaved changes will be discarded.")) setDraft(null); }}>Close editor</button><button type="button" disabled={busy || publishing || !draft.id || JSON.stringify(draft)!==baseline} onClick={() => void publish()}>{publishing?"Publishing…":published===draft.revision?"Published":"Publish saved draft"}</button><span>Draft{draft.revision > 0 ? ` · revision ${draft.revision}` : ""}</span></footer>
        </form> : <><label className={styles.search}>Search this page<input type="search" value={query} onChange={event => setQuery(event.target.value)} /></label><div className={styles.entries}>{entries.filter(item => item.bank === bank && `${item.title} ${item.summary}`.toLowerCase().includes(query.toLowerCase())).map(item => <button key={item.id} disabled={busy} onClick={() => void openDraft(item.id)}><strong>{item.title}</strong><p>{item.summary}</p><small>Draft · {new Date(item.updated_at).toLocaleDateString()}</small></button>)}</div>{ready && !entries.some(item => item.bank === bank) && <p>No drafts yet. Create the first {selected.name.toLowerCase()} entry.</p>}</>}
        {!draft && <div className={styles.paging}><button disabled={page===0||busy} onClick={()=>setPage(value=>value-1)}>Previous</button><span>Page {page+1}</span><button disabled={entries.length<40||busy} onClick={()=>setPage(value=>value+1)}>Next</button></div>}<p role="status">{message}</p>{!ready && <button onClick={() => setReload(value => value + 1)}>Reload banks</button>}
      </div>
    </div>
  </section>;
}
