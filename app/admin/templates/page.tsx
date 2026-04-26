"use client";

import { useState } from "react";

export default function MessageTemplatesPage() {
  const [category, setCategory] = useState("Lead Reply");

  const categories = [
    "Lead Reply",
    "Free Intro",
    "Follow-Up",
    "Closing",
    "Renewal",
    "Missed Session",
  ];

  const templates: any = {
    "Lead Reply": [
      "Hey [Name], I saw you’re interested in training. What are you currently trying to improve right now?",
      "Hey [Name], thanks for reaching out. I do in-home training so you don’t have to deal with the gym. What’s your main goal?",
    ],
    "Free Intro": [
      "Let’s get you set up for a free intro session. What days/times usually work best for you?",
      "I’ve got a couple openings this week. Want to come in for a quick intro so I can see how you move?",
    ],
    "Follow-Up": [
      "Hey [Name], just checking in — still interested in getting started?",
      "Wanted to follow up real quick. I’ve got a couple spots opening up.",
    ],
    Closing: [
      "Based on what we talked about, I’d recommend starting with the 12-session package so we can build momentum.",
      "The fastest way to see results here is consistency — I’d go with 2–3 sessions/week.",
    ],
    Renewal: [
      "You’ve been making solid progress. Let’s keep that going — want to lock in your next set of sessions?",
      "You’re right at the point where most people either fall off or level up. Let’s keep going.",
    ],
    "Missed Session": [
      "Hey [Name], missed you today. Want to reschedule?",
      "All good on missing today — let’s get you back on track. What works next?",
    ],
  };

  return (
    <main className="min-h-screen bg-[#020617] text-white px-5 py-8">
      <section className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="rounded-3xl bg-white/5 border border-white/10 p-6">
          <h1 className="text-4xl font-bold">Message Templates</h1>
          <p className="text-slate-400 mt-2">
            Fast replies = more clients. Use proven messages.
          </p>
        </div>

        {/* Categories */}
        <div className="flex flex-wrap gap-2">
          {categories.map((c) => (
            <button
              key={c}
              onClick={() => setCategory(c)}
              className={`px-4 py-2 rounded-lg text-sm font-semibold ${
                category === c
                  ? "bg-sky-500 text-black"
                  : "bg-white/5 border border-white/10 text-slate-300"
              }`}
            >
              {c}
            </button>
          ))}
        </div>

        {/* Templates */}
        <div className="space-y-4">
          {templates[category].map((text: string, i: number) => (
            <div
              key={i}
              className="rounded-2xl border border-white/10 bg-slate-900 p-5"
            >
              <p className="text-sm text-slate-200">{text}</p>

              <div className="mt-4 flex gap-2">
                <button
                  onClick={() => navigator.clipboard.writeText(text)}
                  className="bg-sky-500 text-black px-4 py-2 rounded-lg text-sm font-bold"
                >
                  Copy
                </button>

                <button className="bg-white/5 border border-white/10 px-4 py-2 rounded-lg text-sm">
                  Edit
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Tip */}
        <div className="rounded-2xl bg-sky-500/10 border border-sky-400/20 p-6">
          <h2 className="text-xl font-bold">Pro Tip</h2>
          <p className="text-slate-300 mt-2 text-sm">
            Don’t overthink messages. Fast, simple, and direct always converts
            better than long explanations.
          </p>
        </div>
      </section>
    </main>
  );
}
