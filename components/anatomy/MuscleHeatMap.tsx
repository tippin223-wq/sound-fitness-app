"use client";

import { useMemo, useState } from "react";
import Body, {
  type ExtendedBodyPart,
  type Slug,
} from "react-muscle-highlighter";
import { useProfile } from "@/components/profile/ProfileProvider";
import {
  calculateMuscleHeat,
  mockCompletedSets,
} from "@/lib/training/calculateMuscleHeat";
import type { MuscleSlug } from "@/components/anatomy/exerciseMuscleMap";
import {
  getBodyModelFromProfile,
  getBodyModelLabel,
  type BodyModel,
} from "@/lib/anatomy/bodyModel";

type BodyView = "front" | "back";

const HEAT_COLORS = ["#22c55e", "#facc15", "#f97316", "#ff3b5c"];

const BODY_SLUGS: MuscleSlug[] = [
  "chest",
  "deltoids",
  "biceps",
  "triceps",
  "forearm",
  "abs",
  "obliques",
  "quadriceps",
  "hamstring",
  "gluteal",
  "calves",
  "trapezius",
  "upper-back",
  "lower-back",
  "adductors",
  "tibialis",
];

function formatSlug(slug: string) {
  return slug.replaceAll("-", " ").replaceAll("_", " ");
}

export default function MuscleHeatMap({
  bodyModel,
}: {
  bodyModel?: BodyModel;
} = {}) {
  const { profile } = useProfile();
  const [side, setSide] = useState<BodyView>("front");
  const [selectedPart, setSelectedPart] = useState<MuscleSlug | null>(null);
  const gender = bodyModel || getBodyModelFromProfile(profile);

  const heatResults = useMemo(() => {
    return calculateMuscleHeat({
      completedSets: mockCompletedSets,
    });
  }, []);

  const bodyData = useMemo<readonly ExtendedBodyPart[]>(() => {
    return BODY_SLUGS.map((slug) => {
      const result = heatResults[slug];

      return {
        slug: slug as Slug,
        intensity: Math.max(1, Math.min(Math.ceil(result.heatScore / 25), 4)),
        styles: {
          stroke: selectedPart === slug ? "#ffffff" : "rgba(255,255,255,0.35)",
          strokeWidth: selectedPart === slug ? 2 : 0.75,
        },
      };
    });
  }, [heatResults, selectedPart]);

  const selectedResult = selectedPart ? heatResults[selectedPart] : null;

  function handleBodyPartPress(part: ExtendedBodyPart) {
    if (!part.slug) return;

    const slug = part.slug as MuscleSlug;

    if (!BODY_SLUGS.includes(slug)) return;

    setSelectedPart(slug);
  }

  return (
    <section className="w-full overflow-hidden rounded-[34px] border border-white/10 bg-[radial-gradient(circle_at_50%_0%,rgba(34,211,238,0.14),transparent_34%),linear-gradient(145deg,rgba(15,23,42,0.94),rgba(2,6,23,0.98))] p-5 shadow-[0_24px_80px_rgba(0,0,0,0.42),inset_0_1px_0_rgba(255,255,255,0.06)]">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="text-[11px] font-black uppercase tracking-[0.3em] text-cyan-300">
            Sound Fitness Anatomy
          </p>

          <h3 className="mt-3 text-2xl font-black text-white">
            Muscle Heat Map
          </h3>

          <p className="mt-2 max-w-xl text-xs leading-5 text-slate-400">
            Heat is calculated from recent effective sets and recovery capacity.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          {(["front", "back"] as BodyView[]).map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => {
                setSide(item);
                setSelectedPart(null);
              }}
              className={`rounded-2xl px-4 py-2 text-xs font-black uppercase tracking-[0.16em] transition ${
                side === item
                  ? "bg-cyan-400 text-slate-950 shadow-[0_0_24px_rgba(34,211,238,0.25)]"
                  : "border border-white/10 bg-white/[0.04] text-slate-300 hover:border-cyan-300/40"
              }`}
            >
              {item}
            </button>
          ))}

          <span className="rounded-2xl border border-emerald-300/25 bg-emerald-300/10 px-4 py-2 text-xs font-black uppercase tracking-[0.16em] text-emerald-100">
            {getBodyModelLabel(gender)} model
          </span>
        </div>
      </div>

      <div className="mt-6 grid gap-5 xl:grid-cols-[1fr_420px]">
        <div className="relative flex min-h-[560px] items-center justify-center overflow-hidden rounded-[30px] border border-white/10 bg-slate-950/45 p-4">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_40%,rgba(34,211,238,0.14),transparent_48%)]" />

          <div className="relative z-10 flex justify-center">
            <Body
              data={bodyData}
              side={side}
              gender={gender}
              scale={1.45}
              colors={HEAT_COLORS}
              defaultFill="#334155"
              defaultStroke="rgba(255,255,255,0.18)"
              defaultStrokeWidth={0.6}
              border="rgba(255,255,255,0.24)"
              hiddenParts={["hair"]}
              onBodyPartPress={handleBodyPartPress}
            />
          </div>
        </div>

        <aside className="flex flex-col gap-5">
          <div className="rounded-[30px] border border-white/10 bg-white/[0.035] p-5">
            <p className="text-[11px] font-black uppercase tracking-[0.26em] text-emerald-300">
              Selected Muscle
            </p>

            {selectedPart && selectedResult ? (
              <div className="mt-4">
                <h4 className="text-xl font-black capitalize text-white">
                  {formatSlug(selectedPart)}
                </h4>

                <div className="mt-4 rounded-2xl border border-white/10 bg-slate-950/55 p-4">
                  <p className="text-xs font-black uppercase text-slate-400">
                    Heat Score
                  </p>

                  <p className="mt-2 text-3xl font-black text-white">
                    {selectedResult.heatScore}%
                  </p>

                  <p className="mt-1 text-xs capitalize text-slate-400">
                    {selectedResult.status.replace("_", " ")}
                  </p>
                </div>

                <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
                  <div className="rounded-2xl border border-white/10 bg-white/[0.035] p-4">
                    <p className="text-xs font-black uppercase text-slate-400">
                      Effective Sets
                    </p>
                    <p className="mt-2 text-2xl font-black text-white">
                      {selectedResult.effectiveSets}
                    </p>
                  </div>

                  <div className="rounded-2xl border border-white/10 bg-white/[0.035] p-4">
                    <p className="text-xs font-black uppercase text-slate-400">
                      Recovery Capacity
                    </p>
                    <p className="mt-2 text-2xl font-black text-white">
                      {selectedResult.recoverableSets}
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="mt-5 rounded-2xl border border-cyan-300/15 bg-cyan-400/10 p-4">
                <p className="text-sm font-bold text-cyan-200">
                  Click a muscle group.
                </p>
                <p className="mt-2 text-xs leading-5 text-slate-400">
                  This panel will show calculated heat, effective sets, and
                  recovery capacity.
                </p>
              </div>
            )}
          </div>

          <div className="max-h-[430px] overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03]">
            <div className="grid grid-cols-[1fr_70px_120px] border-b border-white/10 px-4 py-3 text-[11px] font-black uppercase tracking-[0.16em] text-slate-400">
              <div>Muscle</div>
              <div>Heat</div>
              <div>Status</div>
            </div>

            <div className="max-h-[380px] overflow-y-auto px-4 py-3">
              {Object.values(heatResults).map((result) => {
                const heat = result.heatScore;

                const barColor =
                  heat >= 80
                    ? "from-red-500 to-orange-400"
                    : heat >= 50
                      ? "from-yellow-400 to-amber-300"
                      : "from-emerald-400 to-cyan-300";

                return (
                  <button
                    key={result.slug}
                    onClick={() => setSelectedPart(result.slug)}
                    className={`w-full mb-4 text-left transition ${
                      selectedPart === result.slug ? "scale-[1.02]" : ""
                    }`}
                  >
                    {/* LABEL */}
                    <div className="flex justify-between text-sm mb-1">
                      <span className="capitalize text-white/80">
                        {formatSlug(result.slug)}
                      </span>
                      <span className="text-white/60">{heat}%</span>
                    </div>

                    {/* BAR */}
                    <div className="w-full h-2 rounded-full bg-white/10 overflow-hidden">
                      <div
                        className={`h-full bg-gradient-to-r ${barColor} transition-all duration-700 shadow-[0_0_14px_rgba(34,211,238,0.4)]`}
                        style={{ width: `${heat}%` }}
                      />
                    </div>

                    {/* STATUS */}
                    <div className="text-[11px] text-slate-500 mt-1 capitalize">
                      {result.status.replace("_", " ")}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </aside>
      </div>
    </section>
  );
}
