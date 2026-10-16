"use client";

import { useCallback, useEffect, useState } from "react";
import { loadMemberSchedule, type MemberSession, type SessionBalances } from "@/lib/member-services";

export default function BookingPage() {
  const [sessions, setSessions] = useState<MemberSession[]>([]);
  const [balances, setBalances] = useState<SessionBalances | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [checkedAt, setCheckedAt] = useState(0);
  const refresh = useCallback(async () => {
    setLoading(true);
    try { const result = await loadMemberSchedule(); setSessions(result.sessions); setBalances(result.balances); setCheckedAt(Date.now()); setError(""); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "Schedule could not be loaded."); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { void refresh(); }, [refresh]);
  const upcoming = sessions.filter(session => ["scheduled", "pending_approval"].includes(session.status) && new Date(session.starts_at).getTime() >= checkedAt).sort((a, b) => a.starts_at.localeCompare(b.starts_at));
  const history = sessions.filter(session => !upcoming.some(item => item.id === session.id));
  const renderSession = (session: MemberSession) => <article key={session.id} className="space-y-2 rounded-2xl border border-white/10 bg-slate-950/60 p-4"><h3 className="font-bold">{session.service_type || "Coaching session"}</h3><p>{new Date(session.starts_at).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })} · {session.duration_minutes} minutes</p><p className="text-sm text-slate-300">{[session.coach_name, session.location, session.status.replaceAll("_", " ")].filter(Boolean).join(" · ")}</p></article>;
  return <main className="min-h-screen bg-slate-950 px-5 py-8 text-white"><section className="mx-auto max-w-5xl space-y-6">
    <div className="space-y-4 rounded-3xl border border-white/10 bg-white/5 p-6"><p className="text-xs uppercase tracking-widest text-cyan-300">Your coaching schedule</p><h1 className="text-4xl font-bold">Sessions & booking</h1><p className="text-slate-300">Your app and website use the same booked sessions and package balances. Times below are shown in your device’s timezone.</p><div className="flex flex-wrap gap-3"><a href="https://thesoundfitness.com/client-hub" target="_blank" rel="noopener noreferrer" className="rounded-xl bg-cyan-300 px-4 py-3 font-bold text-slate-950">Book or manage on website</a><button type="button" disabled={loading} onClick={() => void refresh()} className="rounded-xl border border-white/20 px-4 py-3">Refresh schedule</button></div><p className="text-sm text-slate-400">The website checks availability, package eligibility, and change policies when you book. You may need to sign in there.</p></div>
    {loading && <p role="status">Loading your sessions…</p>}{error && <p role="alert" className="text-rose-300">{error}</p>}
    {balances && <div className="grid gap-3 sm:grid-cols-3">{Object.entries(balances).map(([kind, balance]) => <div key={kind} className="rounded-2xl border border-white/10 p-4"><p className="capitalize text-slate-300">{kind} credits</p><p className="text-3xl font-bold">{balance ?? "Unavailable"}</p></div>)}</div>}
    <section className="space-y-3"><h2 className="text-2xl font-bold">Upcoming sessions</h2>{upcoming.map(renderSession)}{!loading && !error && !upcoming.length && <p className="text-slate-400">No upcoming sessions booked.</p>}</section>
    <section className="space-y-3"><h2 className="text-2xl font-bold">Recent bookings</h2>{history.map(renderSession)}{!loading && !error && !history.length && <p className="text-slate-400">Your booking history will appear here.</p>}</section>
  </section></main>;
}
