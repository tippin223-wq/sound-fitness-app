"use client";

import { useMemo, useState } from "react";

const winTypes = [
  "Completed Workout",
  "Strength PR",
  "Better Form",
  "Less Pain",
  "More Energy",
  "Consistency Win",
  "Coach Challenge",
];

const visibilityOptions = ["Community Feed", "Coach Only", "Private Journal"];

export default function SocialPostPage() {
  const [title, setTitle] = useState("");
  const [winType, setWinType] = useState("Completed Workout");
  const [caption, setCaption] = useState("");
  const [photoName, setPhotoName] = useState("");
  const [visibility, setVisibility] = useState("Community Feed");

  const earnedPoints = useMemo(() => {
    if (winType === "Coach Challenge") return 15;
    if (visibility === "Community Feed") return 10;
    return 5;
  }, [winType, visibility]);

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(14,165,233,0.14),_transparent_30%),linear-gradient(180deg,#020617_0%,#0f172a_100%)] text-white">
      <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
        <section className="overflow-hidden rounded-[36px] border border-white/10 bg-white/[0.05] shadow-2xl shadow-black/20 backdrop-blur">
          <div className="grid gap-6 p-6 lg:grid-cols-[1.1fr_0.9fr] lg:p-8">
            <div>
              <div className="text-[11px] uppercase tracking-[0.26em] text-sky-300">
                Sound Fitness Social
              </div>

              <h1 className="mt-3 text-4xl font-bold tracking-tight sm:text-5xl">
                Post a Workout Win
              </h1>

              <p className="mt-4 max-w-2xl text-base leading-7 text-slate-300">
                Share a quick win from your workout, progress, recovery, or
                consistency. Small wins count — and they earn Momentum Points.
              </p>

              <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                <a
                  href="/dashboard/social"
                  className="rounded-2xl border border-white/10 bg-white/5 px-5 py-3 text-center text-sm font-medium text-slate-200 hover:bg-white/10"
                >
                  Back to Social Hub
                </a>

                <a
                  href="/dashboard/progress"
                  className="rounded-2xl border border-white/10 bg-white/5 px-5 py-3 text-center text-sm font-medium text-slate-200 hover:bg-white/10"
                >
                  View My Stats
                </a>
              </div>
            </div>

            <div className="rounded-[30px] border border-yellow-400/20 bg-yellow-500/10 p-5">
              <div className="text-[11px] uppercase tracking-[0.22em] text-yellow-300">
                Momentum Reward
              </div>

              <div className="mt-3 text-5xl font-bold text-yellow-300">
                +{earnedPoints}
              </div>

              <p className="mt-3 text-sm leading-6 text-slate-300">
                You’ll earn Momentum Points when this post is submitted.
                Community posts earn more because they encourage the group.
              </p>

              <div className="mt-5 rounded-2xl border border-white/10 bg-slate-950/55 p-4">
                <div className="text-sm font-semibold text-white">
                  Best posts are simple:
                </div>
                <div className="mt-1 text-sm text-slate-400">
                  “I showed up.” “My form felt better.” “I finished the
                  workout.”
                </div>
              </div>
            </div>
          </div>
        </section>

        <div className="mt-6 grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
          <section className="rounded-[32px] border border-white/10 bg-white/[0.05] p-6 shadow-2xl shadow-black/20 backdrop-blur">
            <div>
              <div className="text-[11px] uppercase tracking-[0.22em] text-emerald-300">
                Create Post
              </div>
              <h2 className="mt-2 text-2xl font-bold tracking-tight">
                What did you win today?
              </h2>
            </div>

            <div className="mt-5 space-y-4">
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Example: Finished lower body day"
                className="w-full rounded-2xl border border-white/10 bg-slate-950/55 px-4 py-3 text-sm text-white outline-none placeholder:text-slate-500 focus:border-sky-400/50"
              />

              <div className="grid gap-4 sm:grid-cols-2">
                <select
                  value={winType}
                  onChange={(e) => setWinType(e.target.value)}
                  className="rounded-2xl border border-white/10 bg-slate-950/55 px-4 py-3 text-sm text-white outline-none focus:border-sky-400/50"
                >
                  {winTypes.map((type) => (
                    <option key={type}>{type}</option>
                  ))}
                </select>

                <select
                  value={visibility}
                  onChange={(e) => setVisibility(e.target.value)}
                  className="rounded-2xl border border-white/10 bg-slate-950/55 px-4 py-3 text-sm text-white outline-none focus:border-sky-400/50"
                >
                  {visibilityOptions.map((option) => (
                    <option key={option}>{option}</option>
                  ))}
                </select>
              </div>

              <textarea
                value={caption}
                onChange={(e) => setCaption(e.target.value)}
                rows={8}
                placeholder="Write your win here..."
                className="w-full rounded-[24px] border border-white/10 bg-slate-950/55 px-4 py-3 text-sm leading-6 text-white outline-none placeholder:text-slate-500 focus:border-sky-400/50"
              />

              <label className="block cursor-pointer rounded-[28px] border border-dashed border-white/15 bg-slate-950/55 p-6 text-center hover:border-sky-400/40 hover:bg-sky-500/10">
                <input
                  type="file"
                  accept="image/*,video/*"
                  className="hidden"
                  onChange={(e) =>
                    setPhotoName(e.target.files?.[0]?.name || "")
                  }
                />

                <div className="text-3xl">📸</div>
                <div className="mt-2 text-sm font-semibold text-white">
                  Add photo or video
                </div>
                <div className="mt-1 text-xs text-slate-400">
                  Workout selfie, equipment setup, progress photo, or short clip
                </div>

                {photoName && (
                  <div className="mt-3 rounded-full border border-sky-400/20 bg-sky-500/10 px-3 py-2 text-xs text-sky-300">
                    {photoName}
                  </div>
                )}
              </label>

              <div className="grid gap-3 sm:grid-cols-2">
                <button className="rounded-2xl bg-sky-500 px-5 py-3 text-sm font-semibold text-slate-950 shadow-lg shadow-sky-500/20 hover:bg-sky-400">
                  Submit Post +{earnedPoints}
                </button>

                <button
                  onClick={() => {
                    setTitle("");
                    setWinType("Completed Workout");
                    setCaption("");
                    setPhotoName("");
                    setVisibility("Community Feed");
                  }}
                  className="rounded-2xl border border-white/10 bg-white/5 px-5 py-3 text-sm font-medium text-slate-200 hover:bg-white/10"
                >
                  Clear
                </button>
              </div>
            </div>
          </section>

          <div className="space-y-6">
            <section className="rounded-[32px] border border-white/10 bg-white/[0.05] p-6 shadow-2xl shadow-black/20 backdrop-blur">
              <div className="text-[11px] uppercase tracking-[0.22em] text-violet-300">
                Live Preview
              </div>

              <h2 className="mt-2 text-2xl font-bold tracking-tight">
                Your post
              </h2>

              <article className="mt-5 rounded-[28px] border border-white/10 bg-slate-950/55 p-5">
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full border border-white/10 bg-white/5 text-sm font-bold text-sky-300">
                    You
                  </div>

                  <div>
                    <div className="text-sm font-semibold text-white">You</div>
                    <div className="mt-1 flex flex-wrap gap-2">
                      <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] uppercase tracking-[0.16em] text-sky-300">
                        {winType}
                      </span>
                      <span className="rounded-full border border-yellow-400/20 bg-yellow-500/10 px-3 py-1 text-xs font-semibold text-yellow-300">
                        +{earnedPoints} Momentum
                      </span>
                    </div>
                  </div>
                </div>

                <div className="mt-5 flex h-56 items-center justify-center rounded-[24px] border border-white/10 bg-white/[0.035]">
                  <div className="text-center">
                    <div className="text-3xl">🖼️</div>
                    <div className="mt-2 text-sm text-slate-400">
                      {photoName || "Photo / video preview"}
                    </div>
                  </div>
                </div>

                <h3 className="mt-5 text-xl font-bold text-white">
                  {title || "Your workout win title"}
                </h3>

                <p className="mt-2 text-sm leading-6 text-slate-300">
                  {caption ||
                    "Write a quick sentence or two about what improved today."}
                </p>

                <div className="mt-4 flex flex-wrap gap-2">
                  <button className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs font-medium text-slate-200">
                    👏 Cheer
                  </button>
                  <button className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs font-medium text-slate-200">
                    💬 Reply
                  </button>
                  <button className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs font-medium text-slate-200">
                    ⭐ Save
                  </button>
                </div>
              </article>
            </section>

            <section className="rounded-[32px] border border-white/10 bg-white/[0.05] p-6 shadow-2xl shadow-black/20 backdrop-blur">
              <div className="text-[11px] uppercase tracking-[0.22em] text-amber-300">
                Easy Prompts
              </div>

              <h2 className="mt-2 text-2xl font-bold tracking-tight">
                Borrow one
              </h2>

              <div className="mt-5 space-y-3">
                {[
                  "I showed up even though I didn’t feel like it.",
                  "My form felt cleaner today.",
                  "I finished the full workout.",
                  "I felt stronger than last week.",
                  "I had less pain or better energy today.",
                ].map((idea) => (
                  <button
                    key={idea}
                    onClick={() => setCaption(idea)}
                    className="w-full rounded-[22px] border border-white/10 bg-slate-950/55 px-4 py-4 text-left text-sm text-slate-300 hover:border-sky-400/40 hover:bg-sky-500/10"
                  >
                    {idea}
                  </button>
                ))}
              </div>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}
