//region 🚀 CLIENT PROFILE PAGE
"use client";

//region 📦 IMPORTS
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import MuscleHeatMap from "@/components/anatomy/MuscleHeatMap";
//endregion

//region 🧾 DEFAULT BIO MODEL
const emptyBio = {
  preferred_name: "",
  age: "",
  phone: "",
  emergency_contact: "",
  location: "",
  occupation: "",
  primary_goal: "Build strength, reduce knee pain, improve consistency",
  motivation: "",
  injuries: "",
  medications: "",
  training_experience: "",
  coaching_style: "",
  equipment: "",
  availability: "",
  nutrition_focus: "",
  sleep: "",
  stress: "",
  notes: "",
};
//endregion

//region 🧠 CLIENT PROFILE COMPONENT
export default function ClientProfilePage() {
  //region 🧩 STATE
  const [userId, setUserId] = useState<string | null>(null);
  const [fullName, setFullName] = useState("Member");
  const [bio, setBio] = useState(emptyBio);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  //endregion

  //region 🔄 LOAD PROFILE FROM SUPABASE
  useEffect(() => {
    async function loadProfile() {
      setLoading(true);

      const { data: authData } = await supabase.auth.getUser();
      if (!authData.user) {
        setLoading(false);
        return;
      }

      setUserId(authData.user.id);

      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("id", authData.user.id)
        .single();

      const name =
        profile?.full_name ||
        authData.user.user_metadata?.full_name ||
        authData.user.email?.split("@")[0] ||
        "Member";

      setFullName(name);

      const { data: savedBio } = await supabase
        .from("client_bios")
        .select("*")
        .eq("id", authData.user.id)
        .single();

      if (savedBio) {
        setBio({
          preferred_name: savedBio.preferred_name || "",
          age: savedBio.age || "",
          phone: savedBio.phone || "",
          emergency_contact: savedBio.emergency_contact || "",
          location: savedBio.location || "",
          occupation: savedBio.occupation || "",
          primary_goal: savedBio.primary_goal || emptyBio.primary_goal,
          motivation: savedBio.motivation || "",
          injuries: savedBio.injuries || "",
          medications: savedBio.medications || "",
          training_experience: savedBio.training_experience || "",
          coaching_style: savedBio.coaching_style || "",
          equipment: savedBio.equipment || "",
          availability: savedBio.availability || "",
          nutrition_focus: savedBio.nutrition_focus || "",
          sleep: savedBio.sleep || "",
          stress: savedBio.stress || "",
          notes: savedBio.notes || "",
        });
      }

      setLoading(false);
    }

    loadProfile();
  }, []);
  //endregion

  //region ⚙️ PROFILE ACTIONS
  function updateBio(field: keyof typeof emptyBio, value: string) {
    setBio((prev) => ({ ...prev, [field]: value }));
  }

  async function saveBio() {
    if (!userId) return;

    setSaving(true);
    setMessage("");

    const { error } = await supabase.from("client_bios").upsert({
      id: userId,
      ...bio,
      updated_at: new Date().toISOString(),
    });

    if (error) {
      setMessage("Could not save profile. Check Supabase table/RLS.");
    } else {
      setMessage("Profile saved ✅");
    }

    setSaving(false);
  }
  //endregion

  //region 📊 DASHBOARD DISPLAY DATA
  const client = {
    goal: bio.primary_goal,
    plan: "In-Home 2x/week + Online Support",
    sessionsRemaining: 7,
    streak: "4 weeks",
  };

  const bodyZones = [
    { zone: "Chest", intensity: "Moderate", color: "bg-sky-400" },
    { zone: "Core", intensity: "High", color: "bg-emerald-400" },
    { zone: "Left Arm", intensity: "Low", color: "bg-amber-300" },
    { zone: "Right Arm", intensity: "Low", color: "bg-amber-300" },
    { zone: "Left Leg", intensity: "High", color: "bg-emerald-400" },
    { zone: "Right Leg", intensity: "High", color: "bg-emerald-400" },
    { zone: "Back", intensity: "Moderate", color: "bg-sky-400" },
    { zone: "Mobility", intensity: "Recovery", color: "bg-violet-400" },
  ];

  const notes = [
    "Knee pain improving during step-ups",
    "Core stability has been consistent",
    "Add more upper body pulling next week",
    "Keep lower body intensity controlled",
  ];
  //endregion

  //region 🎨 SHARED INPUT STYLES
  const inputClass =
    "mt-2 w-full rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-sm text-white outline-none placeholder:text-slate-500 focus:border-sky-400";

  const labelClass = "text-sm font-semibold text-slate-300";
  //endregion

  //region 🧱 PAGE JSX
  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(56,189,248,0.16),_transparent_30%),linear-gradient(180deg,#020617_0%,#0f172a_100%)] text-white">
      {/*region 🔝 APP HEADER */}
      {/*endregion*/}

      {/*region 📦 MAIN CONTENT WRAPPER */}
      <section className="mx-auto w-full max-w-[1120px] space-y-6 px-0 py-8">
        {/*region 👤 CLIENT PROFILE HERO */}
        <div className="rounded-[36px] border border-white/10 bg-white/[0.05] p-6 shadow-2xl">
          <p className="text-[11px] uppercase tracking-[0.28em] text-sky-300">
            Client Profile
          </p>

          <h1 className="mt-3 text-4xl font-bold text-sky-400">{fullName}</h1>

          <p className="mt-3 max-w-3xl text-slate-300">{client.goal}</p>
        </div>
        {/*endregion*/}

        {/*region 📊 QUICK STATS GRID */}
        <div className="grid gap-4 sm:grid-cols-4">
          {[
            ["Plan", client.plan],
            ["Sessions Left", client.sessionsRemaining],
            ["Streak", client.streak],
            ["Primary Focus", "Strength + Mobility"],
          ].map(([label, value]) => (
            <div
              key={label}
              className="rounded-[26px] border border-white/10 bg-white/[0.05] p-5 shadow-xl"
            >
              <p className="text-sm text-slate-400">{label}</p>
              <p className="mt-2 text-xl font-bold text-sky-300">{value}</p>
            </div>
          ))}
        </div>
        {/*endregion*/}

        {/*region 🔥 TRAINING HEAT MAP MASTER */}
        <section className="mt-10 overflow-hidden rounded-[44px] border border-white/10 bg-[radial-gradient(circle_at_50%_15%,rgba(56,189,248,0.16),transparent_30%),radial-gradient(circle_at_12%_20%,rgba(236,72,153,0.13),transparent_24%),linear-gradient(135deg,#020617_0%,#07111f_48%,#020617_100%)] p-6 shadow-[0_30px_120px_rgba(0,0,0,0.72)] lg:p-8">
          <MuscleHeatMap />
        </section>
        {/*endregion*/}

        {/*endregion*/}

        {/*region 🎯 RECOMMENDATION + PERFORMANCE CARDS */}
        <section className="mt-8 grid gap-5 xl:grid-cols-[1.25fr_0.75fr_0.75fr_0.75fr]">
          <section className="rounded-[32px] border border-emerald-400/20 bg-gradient-to-br from-emerald-400/15 to-cyan-400/10 p-6">
            <p className="text-[11px] font-black uppercase tracking-[0.26em] text-emerald-300">
              Recommendation
            </p>

            <h3 className="mt-4 text-3xl font-black text-white">
              Focus on <span className="text-cyan-300">Lower Body</span>
            </h3>

            <p className="mt-3 max-w-lg text-sm leading-6 text-slate-300">
              Your legs and glutes are undertrained compared to upper body. Add
              2–3 lower-body movements this week to improve balance and
              strength.
            </p>

            <button className="mt-5 rounded-2xl bg-cyan-400 px-5 py-3 text-sm font-black text-slate-950 shadow-[0_0_28px_rgba(34,211,238,0.25)] hover:bg-cyan-300">
              View Recommended Workouts →
            </button>
          </section>

          {[
            { icon: "🔥", label: "This Week", value: "4", sub: "Workouts" },
            {
              icon: "🏋️",
              label: "Total Volume",
              value: "12,450",
              sub: "lbs",
            },
            {
              icon: "📈",
              label: "Consistency",
              value: "85%",
              sub: "Great job!",
            },
          ].map((stat) => (
            <section
              key={stat.label}
              className="rounded-[30px] border border-white/10 bg-slate-950/55 p-6 text-center"
            >
              <div className="text-3xl">{stat.icon}</div>
              <p className="mt-3 text-sm text-slate-400">{stat.label}</p>
              <p className="mt-2 text-3xl font-black text-white">
                {stat.value}
              </p>
              <p className="mt-1 text-sm text-slate-400">{stat.sub}</p>
            </section>
          ))}
        </section>
        {/*endregion*/}

        {/*region ⭐ PROGRESS ENCOURAGEMENT STRIP */}
        <section className="mt-5 rounded-[24px] border border-white/10 bg-white/[0.03] px-5 py-4 text-center text-sm text-slate-300">
          ⭐ <span className="font-black text-emerald-300">Keep it up!</span>{" "}
          You’re building consistency and making serious progress.
        </section>
        {/*endregion*/}
        {/*endregion*/}

        {/*region 🧠 COACH NOTES */}
        <section className="space-y-6">
          <div className="rounded-[36px] border border-white/10 bg-white/[0.05] p-6 shadow-2xl">
            <p className="text-[11px] uppercase tracking-[0.24em] text-amber-300">
              Coach Notes
            </p>

            <div className="mt-5 space-y-3">
              {notes.map((note) => (
                <div
                  key={note}
                  className="rounded-2xl border border-white/10 bg-slate-950/60 p-4 text-sm text-slate-200"
                >
                  ✅ {note}
                </div>
              ))}
            </div>
          </div>
        </section>
        {/*endregion*/}

        {/*region 📝 BIOGRAPHIC COLLECTION FORM */}
        <section className="rounded-[36px] border border-white/10 bg-white/[0.05] p-6 shadow-2xl">
          {/*region 🧾 FORM HEADER + SAVE BUTTON */}
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-[11px] uppercase tracking-[0.24em] text-emerald-300">
                Biographic Collection
              </p>
              <h2 className="mt-3 text-2xl font-bold">Member intake profile</h2>
              <p className="mt-2 text-sm text-slate-400">
                {loading
                  ? "Loading saved profile..."
                  : "Edit and save coaching details for this member."}
              </p>
            </div>

            <div className="flex flex-col items-start gap-2 sm:items-end">
              <button
                onClick={saveBio}
                disabled={saving || loading}
                className="rounded-2xl bg-sky-400 px-5 py-3 text-sm font-bold text-slate-950 shadow-lg shadow-sky-500/20 hover:bg-sky-300 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {saving ? "Saving..." : "Save Profile"}
              </button>

              {message && <p className="text-sm text-sky-300">{message}</p>}
            </div>
          </div>
          {/*endregion*/}

          {/*region 🪪 BASIC BIO INPUTS */}
          <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            <label className={labelClass}>
              Preferred Name
              <input
                className={inputClass}
                value={bio.preferred_name}
                onChange={(e) => updateBio("preferred_name", e.target.value)}
                placeholder="Enter preferred name"
              />
            </label>

            <label className={labelClass}>
              Age
              <input
                className={inputClass}
                value={bio.age}
                onChange={(e) => updateBio("age", e.target.value)}
                placeholder="42"
              />
            </label>

            <label className={labelClass}>
              Phone
              <input
                className={inputClass}
                value={bio.phone}
                onChange={(e) => updateBio("phone", e.target.value)}
                placeholder="(555) 555-5555"
              />
            </label>

            <label className={labelClass}>
              Emergency Contact
              <input
                className={inputClass}
                value={bio.emergency_contact}
                onChange={(e) => updateBio("emergency_contact", e.target.value)}
                placeholder="Name + phone"
              />
            </label>

            <label className={labelClass}>
              Location / Service Area
              <input
                className={inputClass}
                value={bio.location}
                onChange={(e) => updateBio("location", e.target.value)}
                placeholder="Redmond, Bellevue, Seattle..."
              />
            </label>

            <label className={labelClass}>
              Occupation
              <input
                className={inputClass}
                value={bio.occupation}
                onChange={(e) => updateBio("occupation", e.target.value)}
                placeholder="Desk job, nurse, retired..."
              />
            </label>
          </div>
          {/*endregion*/}

          {/*region 🧠 EXTENDED COACHING PROFILE FIELDS */}
          <div className="mt-5 grid gap-4 md:grid-cols-2">
            {[
              ["primary_goal", "Primary Goal"],
              ["motivation", "Motivation"],
              ["injuries", "Injuries / Limitations"],
              ["medications", "Medications / Medical Notes"],
              ["training_experience", "Training Experience"],
              ["coaching_style", "Preferred Coaching Style"],
              ["equipment", "Equipment Access"],
              ["availability", "Availability"],
              ["nutrition_focus", "Nutrition Focus"],
              ["sleep", "Sleep / Stress"],
            ].map(([field, label]) => (
              <label key={field} className={labelClass}>
                {label}
                <textarea
                  className={inputClass}
                  rows={3}
                  value={bio[field as keyof typeof emptyBio]}
                  onChange={(e) =>
                    updateBio(field as keyof typeof emptyBio, e.target.value)
                  }
                />
              </label>
            ))}
          </div>
          {/*endregion*/}

          {/*region 🗒️ EXTRA COACH NOTES FIELD */}
          <label className={`${labelClass} mt-5 block`}>
            Extra Coach Notes
            <textarea
              className={inputClass}
              rows={4}
              value={bio.notes}
              onChange={(e) => updateBio("notes", e.target.value)}
              placeholder="Anything important for this member’s coaching experience."
            />
          </label>
          {/*endregion*/}
        </section>
        {/*endregion*/}
      </section>
      {/*endregion*/}
    </main>
  );
  //endregion
}
//endregion
