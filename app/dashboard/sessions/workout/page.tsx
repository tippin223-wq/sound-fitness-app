"use client";

import { useMemo, useState } from "react";

export default function WorkoutBuilderPage() {
  const workout = {
    title: "Lower Body Strength Day",
    subtitle: "Beginner • Dumbbells • 35 min",
    soundscape: "Rain + Soft Pulse",
    timeline: [
      {
        id: 1,
        type: "intro",
        title: "Session Start",
        duration: 30,
        coach:
          "Set your dumbbells nearby, clear your space, and get ready to move.",
      },
      {
        id: 2,
        type: "warmup",
        title: "Glute Bridge",
        subtitle: "Warm-Up 1 • 2 sets x 10 reps",
        duration: 60,
        videoLabel: "Bridge Demo",
        cue: "Drive through your heels and squeeze at the top.",
        note: "Slow and controlled.",
      },
      {
        id: 3,
        type: "warmup",
        title: "Dead Bug",
        subtitle: "Warm-Up 2 • 2 sets x 8/side",
        duration: 60,
        videoLabel: "Dead Bug Demo",
        cue: "Keep your lower back gently pressed down.",
        note: "Exhale as the leg reaches long.",
      },
      {
        id: 4,
        type: "warmup",
        title: "Bodyweight Squat",
        subtitle: "Warm-Up 3 • 2 sets x 8 reps",
        duration: 60,
        videoLabel: "Squat Demo",
        cue: "Sit between your hips and keep your chest tall.",
        note: "Use this to groove the pattern for the main lift.",
      },
      {
        id: 5,
        type: "compound",
        title: "DB Goblet Squat",
        subtitle: "Compound 1 • 3 sets x 8 reps",
        duration: 90,
        videoLabel: "Goblet Squat Demo",
        cue: "Brace first, then descend with control.",
        note: "Rest 60–90 sec between sets.",
      },
      {
        id: 6,
        type: "compound",
        title: "DB Romanian Deadlift",
        subtitle: "Compound 2 • 3 sets x 10 reps",
        duration: 90,
        videoLabel: "RDL Demo",
        cue: "Push the hips back and keep the weights close.",
        note: "Feel hamstrings load before standing tall.",
      },
      {
        id: 7,
        type: "accessory",
        title: "Step-Up",
        subtitle: "Accessory 1 • 2 sets x 10/side",
        duration: 75,
        videoLabel: "Step-Up Demo",
        cue: "Drive through the whole foot on the box.",
        note: "Control the lowering phase.",
      },
      {
        id: 8,
        type: "accessory",
        title: "1-Arm DB Row",
        subtitle: "Accessory 2 • 2 sets x 12/side",
        duration: 75,
        videoLabel: "Row Demo",
        cue: "Pull your elbow toward your hip, not your shoulder.",
        note: "Keep the torso stable.",
      },
      {
        id: 9,
        type: "core",
        title: "Plank",
        subtitle: "Core • 2 rounds x 30 seconds",
        duration: 45,
        videoLabel: "Plank Demo",
        cue: "Squeeze glutes and keep ribs stacked over pelvis.",
        note: "Breathe calmly.",
      },
      {
        id: 10,
        type: "finish",
        title: "Workout Complete",
        duration: 20,
        coach:
          "Nice work. Log how the session felt, then move on with your day stronger than before.",
      },
    ],
  };

  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [soundOn, setSoundOn] = useState(true);

  const current = workout.timeline[currentIndex];
  const progress = useMemo(
    () => Math.round(((currentIndex + 1) / workout.timeline.length) * 100),
    [currentIndex, workout.timeline.length],
  );

  const canGoBack = currentIndex > 0;
  const canGoNext = currentIndex < workout.timeline.length - 1;

  const nextStep = () => canGoNext && setCurrentIndex((i) => i + 1);
  const prevStep = () => canGoBack && setCurrentIndex((i) => i - 1);

  const badgeStyles = {
    intro: "bg-sky-500/15 text-sky-300 border-sky-400/20",
    warmup: "bg-emerald-500/15 text-emerald-300 border-emerald-400/20",
    compound: "bg-orange-500/15 text-orange-300 border-orange-400/20",
    accessory: "bg-violet-500/15 text-violet-300 border-violet-400/20",
    core: "bg-pink-500/15 text-pink-300 border-pink-400/20",
    finish: "bg-cyan-500/15 text-cyan-300 border-cyan-400/20",
  };

  const formatSeconds = (value: number) => {
    const minutes = Math.floor(value / 60);
    const seconds = value % 60;
    return `${minutes}:${String(seconds).padStart(2, "0")}`;
  };

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(56,189,248,0.12),_transparent_30%),linear-gradient(180deg,#020617_0%,#0f172a_100%)] text-white">
      <div className="mx-auto flex min-h-screen max-w-7xl flex-col gap-6 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
        <header className="rounded-[28px] border border-white/10 bg-white/[0.05] p-5 shadow-2xl shadow-black/25 backdrop-blur">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <div className="text-[11px] uppercase tracking-[0.22em] text-sky-300">
                Sound Fitness Session Player
              </div>
              <h1 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">
                {workout.title}
              </h1>
              <p className="mt-2 text-sm text-slate-300">{workout.subtitle}</p>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3">
                <div className="text-[11px] uppercase tracking-[0.2em] text-slate-400">
                  Current Step
                </div>
                <div className="mt-1 text-sm font-semibold text-white">
                  {currentIndex + 1} of {workout.timeline.length}
                </div>
              </div>
              <div className="rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3">
                <div className="text-[11px] uppercase tracking-[0.2em] text-slate-400">
                  Sound
                </div>
                <div className="mt-1 text-sm font-semibold text-white">
                  {soundOn ? workout.soundscape : "Muted"}
                </div>
              </div>
              <div className="rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3">
                <div className="text-[11px] uppercase tracking-[0.2em] text-slate-400">
                  Step Duration
                </div>
                <div className="mt-1 text-sm font-semibold text-white">
                  {formatSeconds(current.duration)}
                </div>
              </div>
            </div>
          </div>

          <div className="mt-5">
            <div className="mb-2 flex items-center justify-between text-xs text-slate-400">
              <span>Session progress</span>
              <span>{progress}%</span>
            </div>
            <div className="h-2 rounded-full bg-white/10">
              <div
                className="h-2 rounded-full bg-gradient-to-r from-sky-400 to-cyan-300 transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        </header>

        <div className="grid flex-1 gap-6 lg:grid-cols-[0.95fr_1.3fr]">
          <aside className="rounded-[28px] border border-white/10 bg-white/[0.05] p-4 shadow-2xl shadow-black/20 backdrop-blur">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <div className="text-lg font-semibold">Workout Timeline</div>
                <div className="text-sm text-slate-400">
                  Each step leads directly into the next.
                </div>
              </div>
            </div>

            <div className="space-y-2">
              {workout.timeline.map((step, index) => {
                const active = index === currentIndex;
                return (
                  <button
                    key={step.id}
                    onClick={() => setCurrentIndex(index)}
                    className={`w-full rounded-2xl border px-4 py-3 text-left transition ${
                      active
                        ? "border-sky-400/40 bg-sky-500/10 shadow-lg shadow-sky-500/10"
                        : "border-white/10 bg-slate-950/45 hover:bg-slate-900/70"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <div className="text-xs text-slate-500">
                          Step {index + 1}
                        </div>
                        <div className="mt-1 text-sm font-semibold text-white">
                          {step.title}
                        </div>
                        {step.subtitle ? (
                          <div className="mt-1 text-xs text-slate-400">
                            {step.subtitle}
                          </div>
                        ) : null}
                      </div>
                      <div className="text-xs text-slate-400">
                        {formatSeconds(step.duration)}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </aside>

          <main className="rounded-[28px] border border-white/10 bg-white/[0.05] p-5 shadow-2xl shadow-black/20 backdrop-blur">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-3">
                <span
                  className={`rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] ${badgeStyles[current.type as keyof typeof badgeStyles]}`}
                >
                  {current.type}
                </span>
                <span className="text-xs uppercase tracking-[0.18em] text-slate-400">
                  {formatSeconds(current.duration)}
                </span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setSoundOn((v) => !v)}
                  className="rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-2 text-sm font-medium text-slate-200 hover:bg-slate-900"
                >
                  {soundOn ? "Mute sound" : "Play sound"}
                </button>
                <button
                  onClick={() => setIsPlaying((v) => !v)}
                  className="rounded-2xl bg-sky-500 px-4 py-2 text-sm font-semibold text-slate-950 shadow-lg shadow-sky-500/20 hover:bg-sky-400"
                >
                  {isPlaying ? "Pause" : "Start"}
                </button>
              </div>
            </div>

            <div className="mt-6 grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
              <div className="rounded-[26px] border border-white/10 bg-slate-950/55 p-4">
                <div className="aspect-video rounded-[22px] border border-dashed border-white/15 bg-[linear-gradient(135deg,rgba(14,165,233,0.12),rgba(15,23,42,0.5))] p-5">
                  <div className="flex h-full flex-col justify-between rounded-[18px] bg-black/20 p-5">
                    <div>
                      <div className="text-[11px] uppercase tracking-[0.22em] text-sky-300">
                        Video
                      </div>
                      <div className="mt-3 text-2xl font-bold text-white">
                        {current.videoLabel || current.title}
                      </div>
                    </div>
                    <div className="text-sm text-slate-300">
                      This area is ready for your movement demo, timer overlay,
                      subtitles, and audio track.
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div className="rounded-[26px] border border-white/10 bg-slate-950/55 p-5">
                  <div className="text-[11px] uppercase tracking-[0.22em] text-slate-400">
                    Current movement
                  </div>
                  <h2 className="mt-2 text-3xl font-bold tracking-tight">
                    {current.title}
                  </h2>
                  {current.subtitle ? (
                    <p className="mt-2 text-sm text-slate-300">
                      {current.subtitle}
                    </p>
                  ) : null}
                </div>

                {current.cue ? (
                  <div className="rounded-[26px] border border-white/10 bg-slate-950/55 p-5">
                    <div className="text-[11px] uppercase tracking-[0.22em] text-emerald-300">
                      Coach cue
                    </div>
                    <p className="mt-2 text-base text-white">{current.cue}</p>
                  </div>
                ) : null}

                {current.note ? (
                  <div className="rounded-[26px] border border-white/10 bg-slate-950/55 p-5">
                    <div className="text-[11px] uppercase tracking-[0.22em] text-violet-300">
                      Focus
                    </div>
                    <p className="mt-2 text-base text-white">{current.note}</p>
                  </div>
                ) : null}

                {current.coach ? (
                  <div className="rounded-[26px] border border-white/10 bg-slate-950/55 p-5">
                    <div className="text-[11px] uppercase tracking-[0.22em] text-cyan-300">
                      Guidance
                    </div>
                    <p className="mt-2 text-base text-white">{current.coach}</p>
                  </div>
                ) : null}
              </div>
            </div>

            <div className="mt-6 flex flex-col gap-3 border-t border-white/10 pt-5 sm:flex-row sm:items-center sm:justify-between">
              <button
                onClick={prevStep}
                disabled={!canGoBack}
                className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-medium text-slate-200 hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-40"
              >
                ← Previous step
              </button>

              <div className="text-center text-xs uppercase tracking-[0.22em] text-slate-500">
                {currentIndex + 1 === workout.timeline.length
                  ? "Final step"
                  : "Advance when ready"}
              </div>

              <button
                onClick={nextStep}
                disabled={!canGoNext}
                className="rounded-2xl bg-sky-500 px-4 py-3 text-sm font-semibold text-slate-950 shadow-lg shadow-sky-500/20 hover:bg-sky-400 disabled:cursor-not-allowed disabled:opacity-40"
              >
                {canGoNext ? "Next step →" : "Session complete"}
              </button>
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}
