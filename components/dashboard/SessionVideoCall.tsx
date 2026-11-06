"use client";

import type { DailyCall } from "@daily-co/daily-js";
import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import { supabase } from "@/lib/supabaseClient";
import { planningAccountGeneration, planningOwner, subscribePlanning } from "@/lib/planning/store";
import { videoCallWindow } from "@/lib/videoCallPolicy";

export default function SessionVideoCall(props: { sessionId: string; startsAt: string }) {
  const account = useSyncExternalStore(subscribePlanning, planningOwner, () => null);
  const generation = useSyncExternalStore(subscribePlanning, planningAccountGeneration, () => -1);
  return <AccountVideoCall key={`${account}:${generation}:${props.sessionId}`} {...props} account={account} generation={generation} />;
}
function AccountVideoCall({ sessionId, startsAt, account, generation }: { sessionId: string; startsAt: string; account: string | null; generation: number }) {
  const host = useRef<HTMLDivElement>(null), dialog = useRef<HTMLDialogElement>(null), call = useRef<DailyCall | null>(null);
  const version = useRef(0), pending = useRef(false), arrivalSent = useRef(false);
  const [open, setOpen] = useState(false), [loading, setLoading] = useState(false), [error, setError] = useState("");
  const [now, setNow] = useState(() => Date.now());
  const dispose = useCallback(() => { const current = call.current; call.current = null; if (current) void current.destroy().catch(() => {}); }, []);
  const close = useCallback(() => { version.current++; pending.current = false; dispose(); setOpen(false); setLoading(false); }, [dispose]);
  useEffect(() => { const timer = setInterval(() => setNow(Date.now()), 30000); return () => { clearInterval(timer); version.current++; dispose(); }; }, [dispose]);
  useEffect(() => { if (open && dialog.current && !dialog.current.open) dialog.current.showModal(); }, [open]);
  const join = async () => {
    if (pending.current) return;
    const windowIssue = videoCallWindow(startsAt);
    if (windowIssue) { setNow(Date.now()); return; }
    pending.current = true; setOpen(true); setLoading(true); setError(""); dispose();
    const requested = ++version.current;
    const current = () => version.current === requested && planningOwner() === account && planningAccountGeneration() === generation;
    try {
      const { data, error: authError } = await supabase.auth.getSession();
      if (!current()) return;
      if (authError || !data.session || data.session.user.id !== account) throw Error("Sign in again to join your session.");
      const headers = { Authorization: `Bearer ${data.session.access_token}`, "Content-Type": "application/json" };
      const response = await fetch("/api/member/video-call", { method: "POST", headers, body: JSON.stringify({ sessionId }), cache: "no-store", redirect: "error", signal: AbortSignal.timeout(25000) });
      const result = await response.json();
      if (!current()) return;
      if (!response.ok || typeof result.url !== "string" || typeof result.token !== "string") throw Error(result.error || "The video room could not be opened.");
      const { default: DailyIframe } = await import("@daily-co/daily-js");
      if (!current() || !host.current) return;
      const instance = DailyIframe.createFrame(host.current, { showLeaveButton: true, iframeStyle: { width: "100%", height: "100%", border: "0", borderRadius: "16px" } });
      call.current = instance;
      instance.on("joined-meeting", () => {
        if (!current() || arrivalSent.current) return;
        arrivalSent.current = true;
        // Use a refreshed account token; only actual room entry notifies the coach.
        void supabase.auth.getSession().then(async auth => {
          if (!current() || auth.data.session?.user.id !== account) return;
          const arrival = await fetch("/api/member/video-call", { method: "PATCH", headers: { Authorization: `Bearer ${auth.data.session.access_token}`, "Content-Type": "application/json" }, body: JSON.stringify({ sessionId }), cache: "no-store", redirect: "error", signal: AbortSignal.timeout(20000) });
          if (!arrival.ok) arrivalSent.current = false;
        }).catch(() => { arrivalSent.current = false; });
      });
      instance.on("left-meeting", () => { if (current() && call.current === instance) close(); });
      // Daily's prejoin screen needs to be usable while join() is pending.
      setLoading(false);
      await instance.join({ url: result.url, token: result.token });
    } catch (cause) { if (current()) { dispose(); setError(cause instanceof Error ? cause.message : "The call could not be joined."); } }
    finally { if (current()) { pending.current = false; setLoading(false); } }
  };
  const windowIssue = videoCallWindow(startsAt, now);
  return <div className="space-y-1 pt-2">
    <button type="button" onClick={() => void join()} disabled={Boolean(windowIssue) || !account || loading} className="rounded-xl bg-cyan-300 px-4 py-2 text-sm font-bold text-slate-950 disabled:opacity-50">Join video call</button>
    {windowIssue && <p className="text-xs text-slate-400">{windowIssue}</p>}
    {open && createPortal(<dialog ref={dialog} onCancel={event => { event.preventDefault(); close(); }} aria-label="Sound Fitness video call" className="fixed inset-0 m-0 h-dvh max-h-none w-screen max-w-none bg-slate-950 p-3 text-white backdrop:bg-black/80">
      <div className="flex h-full flex-col gap-3">
        <header className="flex shrink-0 items-center justify-between gap-3"><div><h2 className="font-bold">Sound Fitness video call</h2><p className="text-xs text-slate-400">Private session · recording disabled</p></div><button type="button" onClick={close} className="rounded-xl border border-white/25 px-4 py-2">Leave call</button></header>
        <div className="relative min-h-0 flex-1 overflow-hidden rounded-2xl border border-white/15"><div ref={host} className="absolute inset-0" />{loading && <p role="status" className="absolute inset-0 grid place-items-center bg-slate-900">Opening your private room…</p>}{error && <div role="alert" className="absolute inset-0 grid place-items-center bg-slate-900 p-5"><div><p>{error}</p><button type="button" onClick={() => void join()} className="mt-3 rounded-xl border border-cyan-300 px-4 py-2">Try again</button></div></div>}</div>
      </div>
    </dialog>, document.body)}
  </div>;
}
