"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function BookingPage() {
  const router = useRouter();

  const [form, setForm] = useState({
    name: "",
    phone: "",
    goal: "",
    location: "",
    sessionType: "Free Intro",
    date: "",
    time: "",
  });

  function handleChange(e: any) {
    setForm({ ...form, [e.target.name]: e.target.value });
  }

  function handleSubmit(e: any) {
    e.preventDefault();
    console.log(form);
    router.push("/confirmation");
  }

  const sessionTypes = [
    "Free Intro",
    "In-Home Training",
    "Online Training",
    "Assisted Stretch",
  ];

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(56,189,248,0.16),_transparent_30%),linear-gradient(180deg,#020617_0%,#0f172a_100%)] px-5 py-8 text-white">
      <section className="mx-auto grid max-w-6xl gap-6 lg:grid-cols-[0.95fr_1.05fr]">
        <div className="space-y-6">
          <div className="rounded-[34px] border border-white/10 bg-white/[0.05] p-6 shadow-2xl backdrop-blur lg:p-8">
            <p className="text-[11px] uppercase tracking-[0.28em] text-sky-300">
              Sound Fitness Booking
            </p>

            <h1 className="mt-4 text-4xl font-bold tracking-tight sm:text-5xl">
              Book your next step.
            </h1>

            <p className="mt-4 text-slate-300">
              Choose the session type, preferred time, and what you want help
              with. We’ll use this to make the first session clear and useful.
            </p>

            <div className="mt-6 grid gap-3 sm:grid-cols-3">
              {["No gym required", "Beginner friendly", "Coach guided"].map(
                (item) => (
                  <div
                    key={item}
                    className="rounded-2xl border border-white/10 bg-slate-950/50 p-3 text-sm text-slate-200"
                  >
                    ✅ {item}
                  </div>
                ),
              )}
            </div>
          </div>

          <div className="rounded-[30px] border border-sky-400/20 bg-sky-500/10 p-5">
            <h2 className="text-xl font-bold">What happens next?</h2>
            <div className="mt-4 space-y-3 text-sm text-slate-200">
              <p>1. Submit your preferred time.</p>
              <p>2. We confirm the session details.</p>
              <p>3. You get a simple starting plan.</p>
            </div>
          </div>
        </div>

        <form
          onSubmit={handleSubmit}
          className="rounded-[34px] border border-white/10 bg-white/[0.05] p-6 shadow-2xl backdrop-blur lg:p-8"
        >
          <div className="grid gap-5">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="text-sm font-semibold text-slate-300">
                  Full Name
                </label>
                <input
                  name="name"
                  value={form.name}
                  onChange={handleChange}
                  required
                  placeholder="Your name"
                  className="mt-2 w-full rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-white outline-none focus:border-sky-400"
                />
              </div>

              <div>
                <label className="text-sm font-semibold text-slate-300">
                  Phone
                </label>
                <input
                  name="phone"
                  value={form.phone}
                  onChange={handleChange}
                  required
                  placeholder="(555) 555-5555"
                  className="mt-2 w-full rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-white outline-none focus:border-sky-400"
                />
              </div>
            </div>

            <div>
              <label className="text-sm font-semibold text-slate-300">
                Session Type
              </label>
              <div className="mt-2 grid gap-3 sm:grid-cols-2">
                {sessionTypes.map((type) => (
                  <label
                    key={type}
                    className={`cursor-pointer rounded-2xl border p-4 transition ${
                      form.sessionType === type
                        ? "border-sky-400 bg-sky-500/15"
                        : "border-white/10 bg-slate-950/60 hover:bg-white/10"
                    }`}
                  >
                    <input
                      type="radio"
                      name="sessionType"
                      value={type}
                      checked={form.sessionType === type}
                      onChange={handleChange}
                      className="sr-only"
                    />
                    <span className="font-semibold">{type}</span>
                  </label>
                ))}
              </div>
            </div>

            <div>
              <label className="text-sm font-semibold text-slate-300">
                Main Goal
              </label>
              <input
                name="goal"
                value={form.goal}
                onChange={handleChange}
                placeholder="Strength, weight loss, mobility, pain-free movement..."
                className="mt-2 w-full rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-white outline-none focus:border-sky-400"
              />
            </div>

            <div>
              <label className="text-sm font-semibold text-slate-300">
                Training Location
              </label>
              <input
                name="location"
                value={form.location}
                onChange={handleChange}
                placeholder="Home, apartment gym, online, park, etc."
                className="mt-2 w-full rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-white outline-none focus:border-sky-400"
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="text-sm font-semibold text-slate-300">
                  Preferred Date
                </label>
                <input
                  type="date"
                  name="date"
                  value={form.date}
                  onChange={handleChange}
                  required
                  className="mt-2 w-full rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-white outline-none focus:border-sky-400"
                />
              </div>

              <div>
                <label className="text-sm font-semibold text-slate-300">
                  Preferred Time
                </label>
                <input
                  type="time"
                  name="time"
                  value={form.time}
                  onChange={handleChange}
                  required
                  className="mt-2 w-full rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-white outline-none focus:border-sky-400"
                />
              </div>
            </div>

            <button
              type="submit"
              className="mt-2 w-full rounded-2xl bg-sky-500 px-5 py-4 font-bold text-slate-950 shadow-lg shadow-sky-500/20 transition hover:bg-sky-400"
            >
              Request Booking
            </button>

            <p className="text-center text-xs text-slate-500">
              This does not charge you. It simply sends your preferred booking
              details.
            </p>
          </div>
        </form>
      </section>
    </main>
  );
}
