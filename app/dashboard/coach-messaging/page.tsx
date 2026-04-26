"use client";

import { useState } from "react";

export default function CoachMessagingPage() {
  const [message, setMessage] = useState("");

  const messages = [
    {
      sender: "Coach Joey",
      role: "Coach",
      text: "Nice work finishing your lower body session. How did the step-ups feel on your knees today?",
      time: "9:12 AM",
    },
    {
      sender: "Client",
      role: "You",
      text: "They felt way better than last week. Still a little tight, but no sharp pain.",
      time: "9:18 AM",
    },
    {
      sender: "Coach Joey",
      role: "Coach",
      text: "Perfect. Keep the same height next time and focus on slow control. We’ll progress once it feels smooth.",
      time: "9:22 AM",
    },
  ];

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
                  onClick={() => setMessage(topic + ": ")}
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
              <h2 className="text-2xl font-bold">Coach Joey</h2>
              <p className="text-sm text-emerald-300">Usually replies soon</p>
            </div>

            <div className="rounded-full border border-emerald-400/20 bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-300">
              Active
            </div>
          </div>

          <div className="mt-5 space-y-4">
            {messages.map((msg, index) => {
              const isClient = msg.role === "You";

              return (
                <div
                  key={index}
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
              setMessage("");
            }}
            className="mt-6 rounded-[28px] border border-white/10 bg-slate-950/70 p-4"
          >
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Message your coach..."
              className="min-h-28 w-full resize-none bg-transparent text-white outline-none placeholder:text-slate-500"
            />

            <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <button
                type="button"
                className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-semibold text-slate-200 hover:bg-white/10"
              >
                Attach Video
              </button>

              <button
                type="submit"
                className="rounded-2xl bg-sky-500 px-5 py-3 text-sm font-bold text-slate-950 hover:bg-sky-400"
              >
                Send Message
              </button>
            </div>
          </form>
        </div>
      </section>
    </main>
  );
}
