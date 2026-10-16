"use client";

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { loadMemberMessages, sendMemberMessage, captureCoachMessageEditor, saveCoachMessageDraft, prepareCoachMessageSend, finishCoachMessageDraft, type MemberMessage } from "@/lib/member-services";
import { planningAccountGeneration, readPlanning, planningOwner, subscribePlanning } from "@/lib/planning/store";

export default function CoachMessagingPage() {
  const account = useSyncExternalStore(subscribePlanning, planningOwner, () => null);
  const generation = useSyncExternalStore(subscribePlanning, planningAccountGeneration, () => null);
  return <AccountCoachMessaging key={`${account ?? "uninitialized"}:${generation}`} account={account} generation={generation} />;
}

function AccountCoachMessaging({ account, generation }: { account: string | null; generation: number | null }) {
  const [message, setMessage] = useState(() => { const draft = readPlanning<unknown>("coachMessageDraft", ""); return typeof draft === "string" ? draft : ""; });
  const [rows, setRows] = useState<MemberMessage[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(Boolean(account));
  const [sending, setSending] = useState(false);
  const sendingRef = useRef(false);
  const mountedRef = useRef(true);
  const refreshVersion = useRef(0);
  const editorRef = useRef(captureCoachMessageEditor());
  const refresh = useCallback(async () => {
    if (!account || sendingRef.current) return;
    const version = ++refreshVersion.current;
    const current = () => mountedRef.current && planningOwner() === account && planningAccountGeneration() === generation && refreshVersion.current === version;
    setLoading(true);
    try { const messages = await loadMemberMessages(); if (current()) { setRows(messages); setError(""); } }
    catch (cause) { if (current()) setError(cause instanceof Error ? cause.message : "Messages could not be loaded."); }
    finally { if (current()) setLoading(false); }
  }, [account, generation]);
  useEffect(() => {
    mountedRef.current = true;
    void refresh();
    return () => { mountedRef.current = false; refreshVersion.current += 1; };
  }, [refresh]);
  const updateMessage = (value: string) => {
    if (sendingRef.current || planningOwner() !== account || planningAccountGeneration() !== generation) return;
    setMessage(value);
    try { editorRef.current = saveCoachMessageDraft(value, editorRef.current); setError(""); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "Draft is in this tab only; browser storage is unavailable."); }
  };
  const send = async () => {
    if (sendingRef.current || !message.trim()) return;
    if (!account || planningOwner() !== account || planningAccountGeneration() !== generation) return;
    refreshVersion.current += 1;
    setLoading(false);
    sendingRef.current = true; setSending(true); setError("");
    try {
      const prepared = prepareCoachMessageSend(message, editorRef.current);
      editorRef.current = prepared.editor;
      const sent = await sendMemberMessage(message, prepared.requestId);
      if (!mountedRef.current || planningOwner() !== account || planningAccountGeneration() !== generation) return;
      setRows(current => current.some(row => row.id === sent.id) ? current : [...current, sent]);
      editorRef.current = finishCoachMessageDraft(prepared.editor);
      setMessage("");
    } catch (cause) { if (mountedRef.current && planningOwner() === account && planningAccountGeneration() === generation) setError(cause instanceof Error ? cause.message : "Message could not be sent."); }
    finally { sendingRef.current = false; if (mountedRef.current && planningOwner() === account && planningAccountGeneration() === generation) setSending(false); }
  };

  const messages = rows.map(row => ({ id: row.id, sender: row.sent_by === "coach" ? "Your coach" : "You", role: row.sent_by === "coach" ? "Coach" : "You", text: row.body, time: new Date(row.created_at).toLocaleString() }));

  const quickTopics = [
    "Form question",
    "Workout felt hard",
    "Pain or discomfort",
    "Schedule change",
    "Nutrition help",
    "Win to share",
  ];

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(56,189,248,0.16),_transparent_30%),linear-gradient(180deg,#020617_0%,#0f172a_100%)] px-5 py-8 text-white">
      <section className="mx-auto grid max-w-7xl gap-6 lg:grid-cols-[0.85fr_1.15fr]">
        <div className="space-y-6">
          <div className="rounded-[36px] border border-white/10 bg-white/[0.05] p-6 shadow-2xl backdrop-blur">
            <p className="text-[11px] uppercase tracking-[0.28em] text-sky-300">
              Coach Messaging
            </p>

            <h1 className="mt-3 text-4xl font-bold">
              Get support between sessions.
            </h1>

            <p className="mt-3 text-slate-300">
              Send updates, ask form questions, report pain, share wins, and
              keep your coach in the loop.
            </p>
          </div>

          <div className="rounded-[32px] border border-white/10 bg-white/[0.05] p-6 shadow-xl">
            <p className="text-[11px] uppercase tracking-[0.24em] text-emerald-300">
              Quick Topics
            </p>

            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              {quickTopics.map((topic) => (
                <button
                  key={topic}
                  type="button"
                  disabled={!account || sending}
                  onClick={() => updateMessage(topic + ": ")}
                  className="rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-left text-sm font-semibold text-slate-200 hover:bg-white/10"
                >
                  {topic}
                </button>
              ))}
            </div>
          </div>

          <div className="rounded-[32px] border border-sky-400/20 bg-sky-500/10 p-6 shadow-xl">
            <h2 className="text-xl font-bold">Best messages include:</h2>
            <div className="mt-4 space-y-3 text-sm text-slate-200">
              <p>✅ What exercise or workout you’re asking about</p>
              <p>✅ What you felt during the movement</p>
              <p>✅ Pain level from 0–10 if something hurt</p>
              <p>✅ A video if you want form feedback later</p>
            </div>
          </div>
        </div>

        <div className="rounded-[36px] border border-white/10 bg-white/[0.05] p-5 shadow-2xl backdrop-blur">
          <div className="flex items-center justify-between border-b border-white/10 pb-4">
            <div>
              <h2 className="text-2xl font-bold">Your coach</h2>
              <p className="text-sm text-slate-300">Shared with your website coaching thread</p>
            </div>

            <div className="rounded-full border border-emerald-400/20 bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-300">
              <button type="button" onClick={() => void refresh()} disabled={!account || loading || sending}>Refresh</button>
            </div>
          </div>

          <div className="mt-5 space-y-4">
            {!account && <p role="status">Waiting for your account’s planning data…</p>}
            {loading && <p role="status">Loading messages…</p>}
            {account && !loading && !messages.length && !error && <p>No messages yet. Start a conversation below.</p>}
            {error && <p role="alert" className="text-rose-300">{error}</p>}
            {messages.map((msg) => {
              const isClient = msg.role === "You";

              return (
                <div
                  key={msg.id}
                  className={`flex ${isClient ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[85%] rounded-[26px] border p-4 ${
                      isClient
                        ? "border-sky-400/20 bg-sky-500/15"
                        : "border-white/10 bg-slate-950/70"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-4">
                      <p className="text-xs font-semibold text-slate-400">
                        {msg.sender}
                      </p>
                      <p className="text-xs text-slate-500">{msg.time}</p>
                    </div>

                    <p className="mt-2 text-sm leading-6 text-slate-100">
                      {msg.text}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              void send();
            }}
            className="mt-6 rounded-[28px] border border-white/10 bg-slate-950/70 p-4"
          >
            <textarea
              value={message}
              onChange={(e) => updateMessage(e.target.value)}
              aria-label="Message your coach"
              maxLength={2000}
              disabled={!account || sending}
              placeholder="Message your coach..."
              className="min-h-28 w-full resize-none bg-transparent text-white outline-none placeholder:text-slate-500"
            />

            <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <button
                type="button"
                disabled
                className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-semibold text-slate-200 hover:bg-white/10"
              >
                Video attachments coming later
              </button>

              <button
                type="submit"
                disabled={!account || sending || !message.trim()}
                className="rounded-2xl bg-sky-500 px-5 py-3 text-sm font-bold text-slate-950 hover:bg-sky-400"
              >
                {sending ? "Sending…" : "Send Message"}
              </button>
            </div>
          </form>
        </div>
      </section>
    </main>
  );
}
