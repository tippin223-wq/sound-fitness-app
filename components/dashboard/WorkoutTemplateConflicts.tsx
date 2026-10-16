"use client";

import { useEffect, useRef, useState } from "react";
import { planningOwner, planningAccountGeneration, subscribePlanning } from "@/lib/planning/store";
import { readWorkoutBuilderTemplates, type LocalWorkoutBuilderTemplate } from "@/lib/localData/workoutBuilderData";
import { reviewWorkoutTemplateConflict, resolveWorkoutTemplateConflict, syncPendingWorkoutTemplates, type WorkoutTemplateConflict } from "@/lib/data/workoutPersistence";

const conflicts = () => readWorkoutBuilderTemplates().filter(item => item.syncPending && item.syncError?.toLowerCase().includes("sync conflict"));

function Version({ label, template }: { label: string; template: LocalWorkoutBuilderTemplate }) {
  return <div className="rounded-xl border border-white/15 p-3">
    <h3 className="font-bold">{label}: {template.title}</h3>
    <p className="mt-1 text-xs text-slate-400">Saved: {template.updatedAt || "Unknown"}</p>
    {template.exercises.length ? <ol className="mt-2 list-inside list-decimal space-y-1 text-sm">
      {template.exercises.map((exercise, index) => <li key={`${exercise.id}-${index}`}>{exercise.name}{exercise.equipment ? ` · ${exercise.equipment}` : ""}</li>)}
    </ol> : <p className="mt-2 text-sm">No exercises</p>}
  </div>;
}

export default function WorkoutTemplateConflicts() {
  const [items, setItems] = useState(conflicts);
  const [review, setReview] = useState<WorkoutTemplateConflict | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const requestRef = useRef(0);
  const mountedRef = useRef(true);
  useEffect(() => {
    mountedRef.current = true;
    let generation = planningAccountGeneration();
    const unsubscribe = subscribePlanning(() => {
      if (generation !== planningAccountGeneration()) {
        generation = planningAccountGeneration(); requestRef.current++;
        setReview(null); setMessage(""); setLoading(false);
      }
      setItems(conflicts());
    });
    return () => { mountedRef.current = false; requestRef.current++; unsubscribe(); };
  }, []);

  const inspect = async (id: string) => {
    const account = planningOwner(), generation = planningAccountGeneration(), request = ++requestRef.current;
    const current = () => mountedRef.current && request === requestRef.current && planningOwner() === account && planningAccountGeneration() === generation;
    setLoading(true); setMessage(""); setReview(null);
    try {
      const next = await reviewWorkoutTemplateConflict(id);
      if (current()) setReview(next);
    } catch (cause) {
      if (current()) setMessage(cause instanceof Error ? cause.message : "Could not load the workout versions.");
    } finally { if (current()) setLoading(false); }
  };

  const resolve = (preferred: "local" | "cloud") => {
    if (!review) return;
    try {
      resolveWorkoutTemplateConflict(review, preferred);
      setReview(null);
      setMessage("Both versions are saved on this device. The backup and any pending edits will sync when connected.");
      void syncPendingWorkoutTemplates();
    } catch (cause) { setMessage(cause instanceof Error ? cause.message : "Could not save the resolution. Both versions are unchanged."); }
  };

  if (!items.length && !review && !message) return null;
  return <section aria-label="Workout template sync conflicts" className="space-y-3 border-b border-amber-300/25 bg-slate-950 px-4 py-3 text-slate-200">
    <h2 className="font-bold">Review workout versions</h2>
    <p className="text-sm">Choose the version to use for this workout. The other version will be saved as a separate backup. Scheduled assignments stay linked to the original workout; new sessions will use the chosen version.</p>
    <div className="flex flex-wrap gap-2">
      {items.map(item => <button type="button" key={item.id} disabled={loading} onClick={() => void inspect(item.id)} className="rounded-lg border border-amber-300/40 px-3 py-2 text-sm disabled:opacity-50">Compare {item.title}</button>)}
    </div>
    {loading && <p role="status">Loading cloud version…</p>}
    {message && <p role="status" className="text-sm">{message}</p>}
    {review && <>
      <div className="grid gap-3 sm:grid-cols-2"><Version label="This device" template={review.local} /><Version label="Cloud" template={review.cloud} /></div>
      <div className="flex flex-wrap gap-2 text-sm">
        <button type="button" onClick={() => resolve("local")} className="rounded-lg border border-cyan-300/40 px-3 py-2">Use local · back up cloud</button>
        <button type="button" onClick={() => resolve("cloud")} className="rounded-lg border border-cyan-300/40 px-3 py-2">Use cloud · back up local</button>
        <button type="button" onClick={() => setReview(null)} className="px-3 py-2">Cancel review</button>
      </div>
    </>}
  </section>;
}
