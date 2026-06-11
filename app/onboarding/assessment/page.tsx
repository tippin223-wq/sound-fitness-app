"use client";

import { useMemo, useState } from "react";

const steps = [
  "Goals",
  "Body & Limitations",
  "Experience",
  "Schedule",
  "Recommendation",
];

type CardOptionProps = {
  label: string;
  selected: boolean;
  onClick: () => void;
  sublabel?: string;
};

function CardOption({
  label,
  selected,
  onClick,
  sublabel,
}: CardOptionProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-[24px] border p-4 text-left transition ${
        selected
          ? "border-sky-400/40 bg-sky-500/10 shadow-lg shadow-sky-500/10"
          : "border-white/10 bg-slate-950/55 hover:bg-slate-900"
      }`}
    >
      <div className="text-base font-semibold text-white">{label}</div>
      {sublabel ? (
        <div className="mt-1 text-sm text-slate-400">{sublabel}</div>
      ) : null}
    </button>
  );
}

export default function AssessmentPage() {
  const [step, setStep] = useState(0);
  const [form, setForm] = useState({
    firstName: "",
    ageRange: "",
    goal: "",
    struggle: "",
    painArea: "",
    painSeverity: "",
    experience: "",
    confidence: "",
    trainingPlace: "In-home",
    sessionsPerWeek: "",
    daysAvailable: "",
  });

  const progress = useMemo(
    () => Math.round(((step + 1) / steps.length) * 100),
    [step],
  );

  const setValue = (key: string, value: string) =>
    setForm((prev) => ({ ...prev, [key]: value }));
  const next = () => setStep((s) => Math.min(s + 1, steps.length - 1));
  const back = () => setStep((s) => Math.max(s - 1, 0));

  const recommendation = useMemo(() => {
    const goal = form.goal || "Strength + mobility";
    const sessions = form.sessionsPerWeek || "2";
    const place = form.trainingPlace || "In-home";

    return {
      title: `${sessions}x/week ${goal} plan`,
      subtitle: `${place} coaching with a focus on consistency, pain-aware progress, and a realistic starting point.`,
      bullets: [
        form.painArea
          ? `Programming should account for ${form.painArea.toLowerCase()} limitations and gradually rebuild confidence.`
          : "Programming can start with a broad full-body approach and build momentum quickly.",
        form.experience === "Beginner"
          ? "Your plan should emphasize simple movement patterns, clear coaching cues, and manageable volume."
          : "Your plan can move faster into structured progression and performance tracking.",
        `A ${sessions} session per week rhythm is the strongest fit based on your current answers.`,
      ],
    };
  }, [form]);

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(14,165,233,0.16),_transparent_28%),linear-gradient(180deg,#020617_0%,#0f172a_100%)] text-white">
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
        <div className="grid gap-6 xl:grid-cols-[0.92fr_1.08fr]">
          <section className="rounded-[32px] border border-white/10 bg-white/[0.05] p-6 shadow-2xl shadow-black/20 backdrop-blur lg:p-8">
            <div className="text-[11px] uppercase tracking-[0.24em] text-sky-300">
              In-Home Pre-Assessment
            </div>
            <h1 className="mt-3 text-4xl font-bold tracking-tight sm:text-5xl">
              Build your first in-home plan
            </h1>
            <p className="mt-4 max-w-xl text-base leading-7 text-slate-300">
              This form helps us understand your goals, your body, your home
              setup, and your schedule before we design the first session.
            </p>

            <div className="mt-6 rounded-[28px] border border-sky-400/20 bg-sky-500/10 p-5">
              <div className="text-[11px] uppercase tracking-[0.22em] text-sky-300">
                What you get
              </div>
              <div className="mt-3 space-y-3 text-sm text-slate-100">
                <div>
                  A clearer starting point based on goals, pain points, home
                  setup, and training history
                </div>
                <div>
                  A more personalized recommendation instead of a generic
                  workout plan
                </div>
                <div>Better coaching decisions from day one</div>
              </div>
            </div>

            <div className="mt-8">
              <div className="mb-2 flex items-center justify-between text-xs uppercase tracking-[0.18em] text-slate-500">
                <span>Progress</span>
                <span>{progress}%</span>
              </div>
              <div className="h-2 rounded-full bg-white/10">
                <div
                  className="h-2 rounded-full bg-gradient-to-r from-sky-400 to-cyan-300 transition-all duration-300"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>

            <div className="mt-8 space-y-3">
              {steps.map((label, index) => (
                <div
                  key={label}
                  className={`flex items-center gap-3 rounded-2xl border px-4 py-3 ${
                    index === step
                      ? "border-sky-400/30 bg-sky-500/10"
                      : index < step
                        ? "border-emerald-400/20 bg-emerald-500/10"
                        : "border-white/10 bg-slate-950/50"
                  }`}
                >
                  <div
                    className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-semibold ${
                      index === step
                        ? "bg-sky-400 text-slate-950"
                        : index < step
                          ? "bg-emerald-400 text-slate-950"
                          : "bg-white/10 text-slate-300"
                    }`}
                  >
                    {index + 1}
                  </div>
                  <div className="text-sm font-medium text-white">{label}</div>
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-[32px] border border-white/10 bg-white/[0.05] p-6 shadow-2xl shadow-black/20 backdrop-blur lg:p-8">
            {step === 0 && (
              <div>
                <div className="text-[11px] uppercase tracking-[0.22em] text-sky-300">
                  Step 1
                </div>
                <h2 className="mt-2 text-3xl font-bold tracking-tight">
                  What are you really trying to improve?
                </h2>
                <p className="mt-3 text-base text-slate-300">
                  Start with the result that matters most so the plan has a
                  clear direction.
                </p>

                <div className="mt-6 grid gap-4 md:grid-cols-2">
                  <div className="md:col-span-2">
                    <input
                      value={form.firstName}
                      onChange={(e) => setValue("firstName", e.target.value)}
                      placeholder="First name"
                      className="w-full rounded-[22px] border border-white/10 bg-slate-950/55 px-4 py-4 text-white placeholder:text-slate-500 focus:border-sky-400/40 focus:outline-none"
                    />
                  </div>
                  <CardOption
                    label="Strength"
                    sublabel="Build strength, confidence, and better movement quality."
                    selected={form.goal === "Strength"}
                    onClick={() => setValue("goal", "Strength")}
                  />
                  <CardOption
                    label="Fat Loss"
                    sublabel="Improve consistency, training, and body composition."
                    selected={form.goal === "Fat Loss"}
                    onClick={() => setValue("goal", "Fat Loss")}
                  />
                  <CardOption
                    label="Mobility"
                    sublabel="Move better, feel better, and reduce stiffness."
                    selected={form.goal === "Mobility"}
                    onClick={() => setValue("goal", "Mobility")}
                  />
                  <CardOption
                    label="Pain-Free Movement"
                    sublabel="Train with more control and less irritation."
                    selected={form.goal === "Pain-Free Movement"}
                    onClick={() => setValue("goal", "Pain-Free Movement")}
                  />
                </div>

                <div className="mt-6">
                  <textarea
                    value={form.struggle}
                    onChange={(e) => setValue("struggle", e.target.value)}
                    placeholder="What has been the biggest thing getting in your way lately?"
                    className="min-h-[130px] w-full rounded-[22px] border border-white/10 bg-slate-950/55 px-4 py-4 text-white placeholder:text-slate-500 focus:border-sky-400/40 focus:outline-none"
                  />
                </div>
              </div>
            )}

            {step === 1 && (
              <div>
                <div className="text-[11px] uppercase tracking-[0.22em] text-sky-300">
                  Step 2
                </div>
                <h2 className="mt-2 text-3xl font-bold tracking-tight">
                  What does your body need us to respect?
                </h2>
                <p className="mt-3 text-base text-slate-300">
                  This helps shape a plan that is realistic, safe, and actually
                  sustainable.
                </p>

                <div className="mt-6 grid gap-4 md:grid-cols-2">
                  {[
                    "No major pain",
                    "Knees",
                    "Low back",
                    "Shoulders",
                    "Hips",
                    "Multiple areas",
                  ].map((item) => (
                    <CardOption
                      key={item}
                      label={item}
                      selected={form.painArea === item}
                      onClick={() => setValue("painArea", item)}
                    />
                  ))}
                </div>

                <div className="mt-6 grid gap-4 md:grid-cols-3">
                  {["Low", "Moderate", "High"].map((item) => (
                    <CardOption
                      key={item}
                      label={item}
                      sublabel="Pain / limitation severity"
                      selected={form.painSeverity === item}
                      onClick={() => setValue("painSeverity", item)}
                    />
                  ))}
                </div>
              </div>
            )}

            {step === 2 && (
              <div>
                <div className="text-[11px] uppercase tracking-[0.22em] text-sky-300">
                  Step 3
                </div>
                <h2 className="mt-2 text-3xl font-bold tracking-tight">
                  Where are you starting from?
                </h2>
                <p className="mt-3 text-base text-slate-300">
                  The best plan depends on both your experience and how
                  confident you feel moving.
                </p>

                <div className="mt-6 grid gap-4 md:grid-cols-3">
                  {["Beginner", "Intermediate", "Advanced"].map((item) => (
                    <CardOption
                      key={item}
                      label={item}
                      selected={form.experience === item}
                      onClick={() => setValue("experience", item)}
                    />
                  ))}
                </div>

                <div className="mt-6 grid gap-4 md:grid-cols-3">
                  {[
                    "Need lots of guidance",
                    "Pretty comfortable",
                    "Very confident",
                  ].map((item) => (
                    <CardOption
                      key={item}
                      label={item}
                      selected={form.confidence === item}
                      onClick={() => setValue("confidence", item)}
                    />
                  ))}
                </div>

                <div className="mt-6 grid gap-4 md:grid-cols-3">
                  {["18–29", "30–44", "45–59", "60+"].map((item) => (
                    <CardOption
                      key={item}
                      label={item}
                      sublabel="Age range"
                      selected={form.ageRange === item}
                      onClick={() => setValue("ageRange", item)}
                    />
                  ))}
                </div>
              </div>
            )}

            {step === 3 && (
              <div>
                <div className="text-[11px] uppercase tracking-[0.22em] text-sky-300">
                  Step 4
                </div>
                <h2 className="mt-2 text-3xl font-bold tracking-tight">
                  What fits your real schedule?
                </h2>
                <p className="mt-3 text-base text-slate-300">
                  This is where the plan becomes something you can actually
                  stick to.
                </p>

                <div className="mt-6 grid gap-4 md:grid-cols-3">
                  {["In-home", "Gym", "Both"].map((item) => (
                    <CardOption
                      key={item}
                      label={item}
                      sublabel="Training location"
                      selected={form.trainingPlace === item}
                      onClick={() => setValue("trainingPlace", item)}
                    />
                  ))}
                </div>

                <div className="mt-6 grid gap-4 md:grid-cols-4">
                  {["1", "2", "3", "4+"].map((item) => (
                    <CardOption
                      key={item}
                      label={item}
                      sublabel="Sessions per week"
                      selected={form.sessionsPerWeek === item}
                      onClick={() => setValue("sessionsPerWeek", item)}
                    />
                  ))}
                </div>

                <div className="mt-6">
                  <textarea
                    value={form.daysAvailable}
                    onChange={(e) => setValue("daysAvailable", e.target.value)}
                    placeholder="Which days or times usually work best for you?"
                    className="min-h-[130px] w-full rounded-[22px] border border-white/10 bg-slate-950/55 px-4 py-4 text-white placeholder:text-slate-500 focus:border-sky-400/40 focus:outline-none"
                  />
                </div>
              </div>
            )}

            {step === 4 && (
              <div>
                <div className="text-[11px] uppercase tracking-[0.22em] text-emerald-300">
                  Recommendation
                </div>
                <h2 className="mt-2 text-3xl font-bold tracking-tight">
                  Here’s your best-fit starting point
                </h2>
                <p className="mt-3 text-base text-slate-300">
                  Based on your answers, this is the direction that makes the
                  most sense right now.
                </p>

                <div className="mt-6 rounded-[28px] border border-sky-400/20 bg-sky-500/10 p-6">
                  <div className="text-[11px] uppercase tracking-[0.22em] text-sky-300">
                    Recommended path
                  </div>
                  <div className="mt-3 text-3xl font-bold tracking-tight text-white">
                    {recommendation.title}
                  </div>
                  <p className="mt-3 max-w-2xl text-base text-slate-100">
                    {recommendation.subtitle}
                  </p>
                </div>

                <div className="mt-6 space-y-3">
                  {recommendation.bullets.map((item) => (
                    <div
                      key={item}
                      className="rounded-[22px] border border-white/10 bg-slate-950/55 px-4 py-4 text-sm leading-7 text-slate-200"
                    >
                      {item}
                    </div>
                  ))}
                </div>

                <div className="mt-6 grid gap-4 md:grid-cols-2">
                  <button className="rounded-[24px] bg-sky-500 px-5 py-4 text-sm font-semibold text-slate-950 shadow-lg shadow-sky-500/20 hover:bg-sky-400">
                    Continue to My Plan
                  </button>
                  <button className="rounded-[24px] border border-white/10 bg-white/5 px-5 py-4 text-sm font-medium text-slate-200 hover:bg-white/10">
                    Book My Intro Session
                  </button>
                </div>
              </div>
            )}

            <div className="mt-8 flex flex-col gap-3 border-t border-white/10 pt-6 sm:flex-row sm:items-center sm:justify-between">
              <button
                type="button"
                onClick={back}
                disabled={step === 0}
                className="rounded-[22px] border border-white/10 bg-white/5 px-5 py-3 text-sm font-medium text-slate-200 hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Back
              </button>

              {step < steps.length - 1 ? (
                <button
                  type="button"
                  onClick={next}
                  className="rounded-[22px] bg-sky-500 px-5 py-3 text-sm font-semibold text-slate-950 shadow-lg shadow-sky-500/20 hover:bg-sky-400"
                >
                  Continue
                </button>
              ) : null}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
