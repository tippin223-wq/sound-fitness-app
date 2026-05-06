"use client";

import React, { useEffect, useMemo, useState } from "react";
import {
  hasWorkoutBuilderSelectedExercises,
  readWorkoutBuilderSelectedExerciseNames,
  writeWorkoutBuilderSelectedExercises,
} from "@/lib/localData/workoutBuilderData";
import { getExerciseCatalogWithLegacyFallback } from "@/lib/training/normalizedExerciseCatalog";
import type { ExerciseCatalogItem } from "@/types";

type Exercise = ExerciseCatalogItem;

const ALL_EXERCISES: Exercise[] = getExerciseCatalogWithLegacyFallback();

const PATTERNS = [
  "All",
  ...Array.from(new Set(ALL_EXERCISES.map((exercise) => exercise.pattern))).sort(),
] as const;

const resolveCatalogExerciseNames = (names: string[]) => {
  const catalogNames = new Set(ALL_EXERCISES.map((exercise) => exercise.name));

  return Array.from(new Set(names)).filter((name) => catalogNames.has(name));
};

const getCatalogExercisesByName = (names: string[]) => {
  const selectedNames = new Set(names);

  return ALL_EXERCISES.filter((exercise) => selectedNames.has(exercise.name));
};

export default function AddExercisesPage() {
  const [query, setQuery] = useState("");
  const [pattern, setPattern] = useState<string>("All");
  const [selected, setSelected] = useState<string[]>([]);
  const [saveMessage, setSaveMessage] = useState("");

  useEffect(() => {
    if (!hasWorkoutBuilderSelectedExercises()) return;

    setSelected(
      resolveCatalogExerciseNames(readWorkoutBuilderSelectedExerciseNames()),
    );
  }, []);

  const filtered = useMemo(() => {
    return ALL_EXERCISES.filter((ex) => {
      const normalizedQuery = query.toLowerCase();
      const matchesQuery =
        ex.name.toLowerCase().includes(normalizedQuery) ||
        ex.body.toLowerCase().includes(normalizedQuery) ||
        ex.muscles.toLowerCase().includes(normalizedQuery) ||
        ex.equipment.toLowerCase().includes(normalizedQuery) ||
        ex.goal.toLowerCase().includes(normalizedQuery);
      const matchesPattern = pattern === "All" ? true : ex.pattern === pattern;
      return matchesQuery && matchesPattern;
    });
  }, [query, pattern]);

  function toggle(name: string) {
    setSaveMessage("");
    setSelected((curr) => {
      const updatedSelection = curr.includes(name)
        ? curr.filter((n) => n !== name)
        : [...curr, name];

      return resolveCatalogExerciseNames(updatedSelection);
    });
  }

  function saveSelectedExercises() {
    const selectedExercises = getCatalogExercisesByName(selected);

    if (selectedExercises.length === 0) {
      setSaveMessage("Select at least one exercise before adding.");
      return;
    }

    writeWorkoutBuilderSelectedExercises(selectedExercises);
    setSaveMessage(
      `${selectedExercises.length} exercise${
        selectedExercises.length === 1 ? "" : "s"
      } saved to this workout. Return to Builder to review.`,
    );
  }

  return (
    <main className="addPage">
      <section className="hero">
        <div>
          <p className="eyebrow">Workout Builder</p>
          <h1>Add Exercises</h1>
          <p>
            Search, filter, and select exercises to add to your workout. Focus
            on movement patterns first, then choose the right variation.
          </p>
        </div>

        <div className="summaryCard">
          <span>{selected.length}</span>
          <h2>Selected</h2>
          <p>Ready to add to workout</p>
        </div>
      </section>

      <section className="controls">
        <input
          placeholder="Search exercises..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />

        <div className="filters">
          {PATTERNS.map((p) => (
            <button
              key={p}
              onClick={() => setPattern(p)}
              className={pattern === p ? "active" : ""}
            >
              {p}
            </button>
          ))}
        </div>
      </section>

      <section className="grid">
        {filtered.length > 0 ? (
          filtered.map((ex) => (
          <button
            key={ex.name}
            onClick={() => toggle(ex.name)}
            className={`card ${selected.includes(ex.name) ? "selected" : ""}`}
          >
            <div className="top">
              <strong>{ex.name}</strong>
              <span>{selected.includes(ex.name) ? "✓" : "+"}</span>
            </div>
            <p>
              {ex.pattern} • {ex.equipment}
            </p>
          </button>
          ))
        ) : (
          <div className="emptyState">
            <strong>No exercises found</strong>
            <span>Try a different search or pattern filter.</span>
          </div>
        )}
      </section>

      <section className="footerBar">
        <div>
          <strong>{selected.length} selected</strong>
          <span>Add these to your workout</span>
          {saveMessage && <p className="saveMessage">{saveMessage}</p>}
        </div>

        <div className="actions">
          <a href="/dashboard/workout-builder/build">Back to Builder</a>
          <button
            type="button"
            onClick={saveSelectedExercises}
            disabled={selected.length === 0}
          >
            Add to Workout
          </button>
        </div>
      </section>

      <style>{`
        .addPage {
          min-height: 100vh;
          padding: 28px;
          color: #f8fafc;
          background:
            radial-gradient(circle at top left, rgba(37,99,235,.25), transparent 34%),
            radial-gradient(circle at top right, rgba(249,115,22,.18), transparent 30%),
            #070707;
          font-family: Inter, system-ui, sans-serif;
        }

        .hero {
          display: grid;
          grid-template-columns: 1fr 280px;
          gap: 20px;
          margin-bottom: 20px;
        }

        .eyebrow {
          color: #60a5fa;
          text-transform: uppercase;
          letter-spacing: .16em;
          font-size: 12px;
          font-weight: 900;
        }

        h1 {
          font-size: clamp(42px, 7vw, 76px);
          margin: 10px 0;
        }

        .hero p {
          color: #cbd5e1;
          max-width: 720px;
        }

        .summaryCard,
        .card,
        .footerBar {
          background: rgba(15,23,42,.76);
          border: 1px solid rgba(148,163,184,.18);
          border-radius: 22px;
          padding: 18px;
        }

        .summaryCard span {
          font-size: 52px;
          font-weight: 900;
        }

        .controls {
          display: grid;
          gap: 12px;
          margin-bottom: 16px;
        }

        input {
          width: 100%;
          border-radius: 14px;
          border: 1px solid rgba(148,163,184,.2);
          background: rgba(0,0,0,.25);
          color: white;
          padding: 12px;
        }

        .filters {
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
        }

        .filters button {
          padding: 8px 12px;
          border-radius: 999px;
          border: 1px solid rgba(148,163,184,.2);
          background: rgba(255,255,255,.06);
          color: white;
          cursor: pointer;
        }

        .filters button.active {
          background: linear-gradient(135deg,#2563eb,#f97316);
          border-color: transparent;
        }

        .grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 12px;
        }

        .emptyState {
          grid-column: 1 / -1;
          border: 1px dashed rgba(148,163,184,.28);
          border-radius: 18px;
          color: #cbd5e1;
          display: grid;
          gap: 6px;
          padding: 18px;
        }

        .emptyState span,
        .saveMessage {
          color: #94a3b8;
        }

        .saveMessage {
          margin: 8px 0 0;
          font-size: 13px;
        }

        .card {
          text-align: left;
          cursor: pointer;
        }

        .card.selected {
          border-color: rgba(249,115,22,.5);
          background: rgba(249,115,22,.14);
        }

        .top {
          display: flex;
          justify-content: space-between;
          margin-bottom: 8px;
        }

        .footerBar {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-top: 18px;
        }

        .actions {
          display: flex;
          gap: 10px;
        }

        .actions a,
        .actions button {
          padding: 10px 14px;
          border-radius: 12px;
          text-decoration: none;
          font-weight: 900;
          color: white;
          border: none;
          cursor: pointer;
          background: linear-gradient(135deg,#2563eb,#f97316);
        }

        .actions button:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        @media (max-width: 900px) {
          .hero,
          .grid {
            grid-template-columns: 1fr;
          }

          .footerBar {
            flex-direction: column;
            gap: 12px;
            align-items: stretch;
          }
        }
      `}</style>
    </main>
  );
}
