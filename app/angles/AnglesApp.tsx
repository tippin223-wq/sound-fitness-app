"use client";

import { useCallback, useEffect, useRef, useState, type FormEvent, type ReactNode } from "react";
import Link from "next/link";
import { Activity, ArrowDown, ArrowLeft, ArrowRight, Check, ChevronRight, Dumbbell, Footprints, History, Home, Layers3, LockKeyhole, Play, ShieldCheck, Sparkles, UserRound, X } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import { syncHistory, verifiedAccount } from "@/lib/angles/account";
import { readHistory, type Result } from "@/lib/angles/assessment";
import Assessment from "./Assessment";

type Section = "home" | "assess" | "workout" | "library" | "history" | "account";
type Member = { id: string; email: string } | null;
const sections = [
  { id: "home", label: "Home", Icon: Home }, { id: "assess", label: "Assess", Icon: Activity },
  { id: "workout", label: "Workout", Icon: Dumbbell }, { id: "library", label: "Library", Icon: Layers3 },
  { id: "history", label: "History", Icon: History }, { id: "account", label: "Account", Icon: UserRound },
] as const;

function Brand() { return <span className="an-brand"><svg viewBox="0 0 42 44" aria-hidden="true"><path d="M4 36 21 5 38 36M12 23h18" /><path d="m7 41 14-8 14 8" /></svg><span>ANGLES<small>by Sound Fitness</small></span></span>; }

function Modal({ title, onClose, children, wide = false }: { title: string; onClose: () => void; children: ReactNode; wide?: boolean }) {
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => { const element = dialog.current!; element.showModal(); return () => element.close(); }, []);
  return <dialog ref={dialog} onCancel={event => { event.preventDefault(); onClose(); }} className={`an-dialog ${wide ? "an-dialog-wide" : ""}`} aria-label={title}>
    <div className="an-dialog-heading"><h2>{title}</h2><button className="an-icon-button" onClick={onClose} aria-label={`Close ${title}`}><X size={20} /></button></div>{children}
  </dialog>;
}

function Pricing({ onClose, onAccount }: { onClose: () => void; onAccount: () => void }) {
  const [page, setPage] = useState(0);
  const rail = useRef<HTMLDivElement>(null);
  function select(index: number) { rail.current?.scrollTo({ left: index * rail.current.clientWidth, behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" }); }
  const groups = [[{ name: "Angles only", price: 10, tag: "JUST ANGLES", description: "Your dedicated movement companion. Full Angles access with your Sound Fitness account.", features: ["Released assessments & exercise tracking", "Saved History and account sync"], color: "mint" }], [
    { name: "App Only", price: 29, tag: "CORE MEMBERSHIP", description: "The core Sound Fitness app for self-guided training.", features: ["Training tools and progress tracking", "Angles is not included"], color: "blue" },
    { name: "Hybrid", price: 79, tag: "ANGLES INCLUDED", description: "Your training ecosystem, together.", features: ["Core Sound Fitness membership", "Angles and included companion apps"], color: "gold" },
    { name: "Online Coaching", price: 199, tag: "ANGLES + COACHING", description: "Personal guidance for your next step.", features: ["Everything in Hybrid, including Angles", "Programming, coaching and check-ins"], color: "purple" },
  ]];
  return <Modal title="Find your fit." onClose={onClose} wide>
    <p className="an-dialog-intro">One account. Train your way.</p>
    <div className="an-pricing-tabs" role="tablist" aria-label="Pricing categories">{["Angles", "Sound Fitness"].map((label, index) => <button key={label} role="tab" id={`an-price-tab-${index}`} aria-selected={page === index} aria-controls={`an-price-panel-${index}`} onClick={() => select(index)} onKeyDown={e => { if (e.key === "ArrowRight" || e.key === "ArrowLeft") { e.preventDefault(); const next = index === 0 ? 1 : 0; select(next); document.getElementById(`an-price-tab-${next}`)?.focus(); } }}>{label}</button>)}</div>
    <p className="an-swipe-hint">Swipe sideways to compare <ArrowRight size={14} /></p>
    <div ref={rail} className="an-pricing-rail" onScroll={e => setPage(Math.round(e.currentTarget.scrollLeft / e.currentTarget.clientWidth))}>
      {groups.map((plans, index) => <div key={index} role="tabpanel" aria-labelledby={`an-price-tab-${index}`} id={`an-price-panel-${index}`} inert={page !== index} className="an-pricing-column">
        {index === 0 && <div className="an-free-note"><Sparkles size={20} /><p><strong>Start with a little movement.</strong>Try the bodyweight squat assessment free, with repeat attempts.</p></div>}
        {plans.map(plan => <article className={`an-plan an-plan-${plan.color}`} key={plan.name}><span className="an-eyebrow">{plan.tag}</span><h3>{plan.name}</h3><div className="an-plan-price">${plan.price}<span>/ month</span></div><p>{plan.description}</p><ul>{plan.features.map(feature => <li key={feature}><Check size={16} />{feature}</li>)}</ul></article>)}
        <p className="an-fine-print">Purchases coming soon.{index === 1 ? " Companion-app bundle coming soon." : ""}</p>
      </div>)}
    </div><footer className="an-dialog-footer"><span>Already part of Sound Fitness?</span><button className="an-primary" onClick={onAccount}>Sign in <ArrowRight size={17} /></button></footer>
  </Modal>;
}

function Account({ member, factor, onVerified, onClose }: { member: Member; factor: string | null; onVerified: () => Promise<void>; onClose: () => void }) {
  const [email, setEmail] = useState(""), [password, setPassword] = useState(""), [code, setCode] = useState("");
  const [busy, setBusy] = useState(false), [message, setMessage] = useState("");
  async function submit(event: FormEvent) {
    event.preventDefault(); setBusy(true); setMessage("");
    try {
      if (factor) {
        if (factor === "unsupported") throw Error("Complete your additional verification through the Sound Fitness account portal.");
        const { error } = await supabase.auth.mfa.challengeAndVerify({ factorId: factor, code }); if (error) throw error;
      } else { const { error } = await supabase.auth.signInWithPassword({ email, password }); if (error) throw error; }
      setPassword(""); setCode(""); await onVerified();
    } catch (error) { setMessage(error instanceof Error ? error.message : "Sign-in could not be completed."); }
    finally { setBusy(false); }
  }
  return <Modal title={member ? "Your account." : "Welcome back."} onClose={onClose}>
    <div className="an-account-emblem"><UserRound size={30} /></div>
    {member ? <div className="an-account-content"><span className="an-eyebrow">CONNECTED TO SOUND FITNESS</span><p>{member.email}</p><p className="an-muted">Your Angles assessments have their own History. Sync summaries from the History screen to share them with your Android app.</p><a className="an-secondary" href="https://thesoundfitness.com/client-hub/settings" target="_blank" rel="noreferrer">Linked accounts & settings <ArrowRight size={16} /></a><button className="an-text-button" disabled={busy} onClick={async () => { setBusy(true); const { error } = await supabase.auth.signOut({ scope: "local" }); if (error) setMessage(error.message); await onVerified(); setBusy(false); }}>Sign out on this browser</button></div> :
      <form className="an-account-content" onSubmit={submit}><p className="an-muted">Use your Sound Fitness account. Your identity stays connected across the ecosystem.</p>
        {factor ? <label className="an-field">Authenticator code<input value={code} onChange={e => setCode(e.target.value)} inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" required maxLength={6} /></label> : <><label className="an-field">Email<input type="email" value={email} onChange={e => setEmail(e.target.value)} autoComplete="username" required /></label><label className="an-field">Password<input type="password" value={password} onChange={e => setPassword(e.target.value)} autoComplete="current-password" required /></label></>}
        <button className="an-primary" disabled={busy || factor === "unsupported"}>{busy ? "Checking…" : factor ? "Verify & continue" : "Sign in"}<ArrowRight size={18} /></button>
        <div className="an-auth-links"><a href="https://thesoundfitness.com/client-hub/forgot-password" target="_blank" rel="noreferrer">Forgot password?</a><Link href="/signup">Create an account</Link></div>
      </form>}
    {message && <p className="an-notice" role="alert">{message}</p>}
  </Modal>;
}

function HistoryPage({ owner, onAssess }: { owner: string | null; onAssess: () => void }) {
  const [results, setResults] = useState<Result[]>([]), [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    function load() { try { setResults(readHistory(localStorage, owner)); setMessage(""); } catch { setResults([]); setMessage("History could not be read. Its original data has been preserved."); } }
    load(); window.addEventListener("storage", load); return () => window.removeEventListener("storage", load);
  }, [owner]);
  async function sync() {
    if (!owner) return;
    setBusy(true); setMessage("");
    try { setResults(await syncHistory(owner)); setMessage("Account History synced."); }
    catch (error) { setMessage(error instanceof Error ? error.message : "Sync unavailable. Your browser History is preserved."); }
    finally { setBusy(false); }
  }
  return <section className="an-workspace"><div className="an-section-heading"><div><span className="an-eyebrow">Your movement, remembered</span><h1>History<span>.</span></h1></div>{owner && <button className="an-secondary" disabled={busy} onClick={sync}>{busy ? "Syncing…" : "Sync account History"}</button>}</div>
    <p className="an-muted">{owner ? "Saved to this account on this browser. Sync to upload summaries and retrieve your Android results." : "Device-only results on this browser. Sign in for separate account History; guest results are not silently attached."}</p>
    {message && <p className="an-notice" role="status">{message}</p>}
    {!results.length ? <div className="an-empty"><History size={34} /><h2>Your next movement starts the story.</h2><p>No saved sessions yet.</p><button className="an-primary" onClick={onAssess}>Try a free assessment <ArrowRight size={16} /></button></div> : <div className="an-history-list">{[...results].sort((a,b) => b.completedAt-a.completedAt).map(result => <article key={result.id}><div className="an-history-icon"><Activity size={24} /></div><div><span className="an-eyebrow">{result.mode}</span><h2>Bodyweight squat</h2><p>{new Date(result.completedAt).toLocaleString()}</p></div><div className="an-history-numbers"><strong>{result.reps}<small> reps</small></strong><span>{result.minKneeAngle}°–{result.maxKneeAngle}° knee range</span><span>{Math.round((result.completedAt-result.startedAt)/1000)}s elapsed · {result.reliableSamples} samples</span></div></article>)}</div>}
  </section>;
}

const demos = [{ title: "Bodyweight squat", file: "bodyweight_squat", note: "Build a controlled foundation", category: "FOUNDATION" }, { title: "Lunge", file: "lunge", note: "Explore balance and control", category: "LOWER BODY" }, { title: "Plank", file: "plank", note: "Practice a steady position", category: "CORE" }, { title: "Push-up", file: "push_up", note: "Move with intent", category: "UPPER BODY" }, { title: "Single-leg squat", file: "single_leg_squat", note: "One side at a time", category: "BALANCE" }];
function Library({ onAssess }: { onAssess: () => void }) {
  const [selected, setSelected] = useState(0);
  return <section className="an-workspace"><div className="an-section-heading"><div><span className="an-eyebrow">A little practice goes a long way</span><h1>Movement library<span>.</span></h1></div></div><div className="an-library-grid"><div className="an-library-video"><video key={demos[selected].file} src={`/angles-assets/assessment_${demos[selected].file}.mp4`} controls playsInline muted preload="metadata" /><span>Exercise demonstration · {demos[selected].title}</span></div><div className="an-library-list">{demos.map((demo,index) => <button className={selected === index ? "an-selected" : ""} onClick={() => setSelected(index)} key={demo.file} aria-pressed={selected === index}><span className="an-library-index">0{index+1}</span><span><small>{demo.category}</small><strong>{demo.title}</strong><span>{demo.note}</span></span><Play size={17} /></button>)}<p className="an-fine-print">These are practice demonstrations. Live rep counting currently supports the bodyweight squat.</p><button className="an-primary" onClick={onAssess}>Assess your squat <ArrowRight size={17} /></button></div></div></section>;
}

export default function AnglesApp() {
  const [section, setSection] = useState<Section>("home"), [modal, setModal] = useState<"pricing" | "account" | null>(null);
  const [member, setMember] = useState<Member>(null), [factor, setFactor] = useState<string | null>(null), [checking, setChecking] = useState(true);
  const [authError, setAuthError] = useState("");
  const dirty = useRef(false), verification = useRef(0), background = useRef<HTMLVideoElement>(null);
  const verify = useCallback(async () => {
    const request = ++verification.current; setChecking(true);
    try { const account = await verifiedAccount(); if (request === verification.current) { setMember(account.user); setFactor(account.factor); setAuthError(""); } }
    catch { if (request === verification.current) { setMember(null); setFactor(null); setAuthError("Account verification is unavailable. Device-only assessments remain available."); } }
    finally { if (request === verification.current) setChecking(false); }
  }, []);
  const cancelVerification = useCallback(() => { verification.current++; }, []);
  useEffect(() => {
    const initial = window.setTimeout(() => verify(), 0);
    const { data } = supabase.auth.onAuthStateChange(() => { window.setTimeout(() => verify(), 0); });
    return () => { clearTimeout(initial); cancelVerification(); data.subscription.unsubscribe(); };
  }, [verify, cancelVerification]);
  useEffect(() => { window.scrollTo(0, 0); }, [section]);
  useEffect(() => {
    const element = background.current; if (!element) return;
    const preference = matchMedia("(prefers-reduced-motion: reduce)");
    function update() { if (modal || document.hidden || preference.matches) element!.pause(); else element!.play().catch(() => {}); }
    update(); document.addEventListener("visibilitychange", update); preference.addEventListener("change", update);
    return () => { document.removeEventListener("visibilitychange", update); preference.removeEventListener("change", update); };
  }, [modal, section]);
  function go(next: Section) {
    if (next === "account") { setModal("account"); return; }
    if (next === section) return;
    if (dirty.current && !window.confirm("Leave without saving this assessment?")) return;
    dirty.current = false; setSection(next);
  }
  const preview = section === "home" && !member;
  return <main className="angles-app">
    <header className="an-header"><button className="an-brand-button" onClick={() => go("home")} aria-label="Angles home"><Brand /></button><div className="an-header-actions"><Link href="/">Sound Fitness <ChevronRight size={14} /></Link><button className="an-account-button" onClick={() => setModal("account")} disabled={checking}><UserRound size={16} />{checking ? "Connecting…" : member ? "Your account" : "Sign in"}</button></div></header>
    {authError && <p className="an-global-notice" role="status">{authError}</p>}
    {section !== "home" && <button className="an-back" onClick={() => go("home")}><ArrowLeft size={16} /> Back to Angles</button>}
    {section === "home" ? <section className="an-home"><div className="an-home-copy"><span className="an-eyebrow"><span className="an-dot" /> A better connection to your movement</span><h1>Track your<br /><span>movement.</span><br />Train. Play.</h1><p>See how you move. Find your rhythm.<br className="an-desktop-break" /> Make your next rep a little more intentional.</p><div className="an-home-actions"><button className="an-primary" onClick={() => go("assess")} disabled={checking}>Try a free squat assessment <ArrowRight size={19} /></button><button className="an-secondary" onClick={() => setModal("account")} disabled={checking}>{member ? "Your Sound Fitness account" : "Sign in"}<UserRound size={17} /></button><span className="an-account-hint">Use your Sound Fitness account.</span><button className="an-plan-link" onClick={() => setModal("pricing")}>View plans <ArrowRight size={15} /></button></div><div className="an-trust"><span><ShieldCheck size={15} /> On-device processing</span><span><LockKeyhole size={14} /> Your camera stays yours</span></div></div>
      <div className="an-home-visual"><div className="an-orbit an-orbit-one" /><div className="an-orbit an-orbit-two" /><div className="an-video-frame"><video ref={background} src="/angles-assets/assessment_bodyweight_squat.mp4" muted loop playsInline preload="auto" aria-label="Bodyweight squat exercise demonstration" /><div className="an-video-shade" /><div className="an-video-label"><span className="an-dot" /><span>BODYWEIGHT SQUAT<small>Exercise demonstration</small></span><Activity size={25} /></div></div><span className="an-visual-note"><Footprints size={16} /> Every movement is a starting point.</span></div>
    </section> : section === "assess" || section === "workout" ? <Assessment key={section} owner={member?.id ?? null} workout={section === "workout"} onDirty={value => { dirty.current = value; }} onSaved={() => { dirty.current = false; setSection("history"); }} /> : section === "library" ? <Library onAssess={() => go("assess")} /> : section === "history" ? checking ? <section className="an-empty" role="status">Checking your account…</section> : <HistoryPage key={member?.id ?? "guest"} owner={member?.id ?? null} onAssess={() => go("assess")} /> : null}
    <nav className={`an-navigation ${preview ? "an-navigation-preview" : ""}`} aria-label={preview ? "Feature preview · sign in to use the menu" : "Angles navigation"}>
      <div className="an-nav-track">{Array.from({ length: preview ? 2 : 1 }, (_, copy) => <div className="an-nav-copy" key={copy} aria-hidden={copy === 1 || undefined}>{sections.map(({ id, label, Icon }) => preview ? <span className="an-nav-preview-item" key={id}><Icon size={20} />{label}</span> : <button key={id} onClick={() => go(id)} aria-current={section === id ? "page" : undefined}><Icon size={20} />{label}</button>)}</div>)}</div>
    </nav>
    <footer className="an-footer"><span>ANGLES / SOUND FITNESS</span><span>Move with curiosity. <ArrowDown size={12} /></span></footer>
    {modal === "pricing" && <Pricing onClose={() => setModal(null)} onAccount={() => setModal("account")} />}
    {modal === "account" && <Account member={member} factor={factor} onVerified={verify} onClose={() => setModal(null)} />}
  </main>;
}
