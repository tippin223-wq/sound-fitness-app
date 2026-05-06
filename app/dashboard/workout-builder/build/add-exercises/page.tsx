"use client";

import React, { useMemo, useState } from "react";

type Exercise = {
  name: string;
  pattern: "Squat" | "Hinge" | "Push" | "Pull" | "Core" | "Carry";
  equipment: "Bodyweight" | "Dumbbell" | "Barbell" | "Cable";
};

const ALL_EXERCISES: Exercise[] = [
  { name: "Goblet Squat", pattern: "Squat", equipment: "Dumbbell" },
  { name: "Back Squat", pattern: "Squat", equipment: "Barbell" },
  { name: "Romanian Deadlift", pattern: "Hinge", equipment: "Dumbbell" },
  { name: "Deadlift", pattern: "Hinge", equipment: "Barbell" },
  { name: "Push-Up", pattern: "Push", equipment: "Bodyweight" },
  { name: "DB Bench Press", pattern: "Push", equipment: "Dumbbell" },
  { name: "1-Arm Row", pattern: "Pull", equipment: "Dumbbell" },
  { name: "Cable Row", pattern: "Pull", equipment: "Cable" },
  { name: "Dead Bug", pattern: "Core", equipment: "Bodyweight" },
  { name: "Pallof Press", pattern: "Core", equipment: "Cable" },
  { name: "Farmer Carry", pattern: "Carry", equipment: "Dumbbell" },
];

const PATTERNS = [
  "All",
  "Squat",
  "Hinge",
  "Push",
  "Pull",
  "Core",
  "Carry",
] as const;

export default function AddExercisesPage() {
  const [query, setQuery] = useState("");
  const [pattern, setPattern] = useState<(typeof PATTERNS)[number]>("All");
  const [selected, setSelected] = useState<string[]>([]);

  const filtered = useMemo(() => {
    return ALL_EXERCISES.filter((ex) => {
      const matchesQuery = ex.name.toLowerCase().includes(query.toLowerCase());
      const matchesPattern = pattern === "All" ? true : ex.pattern === pattern;
      return matchesQuery && matchesPattern;
    });
  }, [query, pattern]);

  function toggle(name: string) {
    setSelected((curr) =>
      curr.includes(name) ? curr.filter((n) => n !== name) : [...curr, name],
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
        {filtered.map((ex) => (
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
        ))}
      </section>

      <section className="footerBar">
        <div>
          <strong>{selected.length} selected</strong>
          <span>Add these to your workout</span>
        </div>

        <div className="actions">
          <a href="/dashboard/workout-builder/build">Back to Builder</a>
          <button disabled={selected.length === 0}>Add to Workout</button>
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
