"use client";

import { useState } from "react";
import {
  readWorkoutBuilderSelectedExercises,
  writeWorkoutBuilderSelectedExercises,
} from "@/lib/localData/workoutBuilderData";
import { ROUTES } from "@/lib/routes";
import { getExerciseCatalogWithLegacyFallback } from "@/lib/training/normalizedExerciseCatalog";
import type { ExerciseCatalogItem } from "@/types";

const demoExerciseNames = [
  "Goblet Squat",
  "Barbell Bench Press",
  "Conventional Deadlift",
  "Bent Over Row",
  "DB Shoulder Press",
];

const catalogExercises: ExerciseCatalogItem[] =
  getExerciseCatalogWithLegacyFallback();

const exercises = demoExerciseNames
  .map((name) => catalogExercises.find((exercise) => exercise.name === name))
  .filter(Boolean) as ExerciseCatalogItem[];

const demoExercises =
  exercises.length > 0 ? exercises : catalogExercises.slice(0, 5);

export default function BuilderExerciseDemoPage() {
  const [selected, setSelected] = useState(
    demoExercises[0]?.name || "Exercise Demo",
  );
  const [builderStatus, setBuilderStatus] = useState("");
  const selectedExercise =
    demoExercises.find((exercise) => exercise.name === selected) ||
    demoExercises[0];

  function addSelectedExerciseToBuilder() {
    if (!selectedExercise) return;

    const existingExercises = readWorkoutBuilderSelectedExercises();
    const alreadySelected = existingExercises.some(
      (exercise) => exercise.name === selectedExercise.name,
    );

    if (alreadySelected) {
      setBuilderStatus(`${selectedExercise.name} is already in Workout Builder.`);
      return;
    }

    writeWorkoutBuilderSelectedExercises([
      ...existingExercises.map((exercise) => ({
        id: exercise.id,
        name: exercise.name,
        body: exercise.body,
        muscles: "",
        pattern: exercise.pattern,
        goal: exercise.goal,
        equipment: exercise.equipment,
        level: "",
        image: "",
        cue: "",
      })),
      selectedExercise,
    ]);
    setBuilderStatus(`${selectedExercise.name} added to Workout Builder.`);
  }

  return (
    <main className="builderDemoPage">
      <section className="hero">
        <div>
          <p className="eyebrow">Workout Builder</p>
          <h1>Exercise Demo</h1>
          <p>
            Preview exercises before adding them to a workout. Use demos to
            coach form and structure your program.
          </p>
        </div>

        <div className="quickCard">
          <h2>{selectedExercise?.name || selected}</h2>
          <p>
            {selectedExercise
              ? `${selectedExercise.pattern} - ${selectedExercise.equipment}`
              : "Movement demo, cues, mistakes, and programming notes."}
          </p>
        </div>
      </section>

      <section className="layout">
        <aside className="exerciseList">
          <h2>Exercises</h2>

          {demoExercises.map((ex) => (
            <button
              key={ex.id}
              onClick={() => setSelected(ex.name)}
              className={selected === ex.name ? "active" : ""}
            >
              {ex.name}
            </button>
          ))}
        </aside>

        <section className="demoPanel">
          <div className="videoBox">
            <div>
              <span>▶</span>
              <p>{selected} Demo</p>
              <small>Add real video later</small>
            </div>
          </div>

          <div className="infoGrid">
            <div className="card">
              <h3>Coach Cues</h3>
              <ul>
                <li>{selectedExercise?.cue || "Stay controlled"}</li>
                <li>Brace before moving</li>
                <li>Use full range of motion</li>
              </ul>
            </div>

            <div className="card">
              <h3>Common Mistakes</h3>
              <ul>
                <li>Rushing reps</li>
                <li>Breaking form</li>
                <li>Using too much weight</li>
              </ul>
            </div>

            <div className="card">
              <h3>Programming Use</h3>
              <p>
                Use this exercise for strength development, technique work, or
                accessory training depending on load and volume.
              </p>
            </div>

            <div className="card">
              <h3>Best Practice</h3>
              <p>
                Select exercises that match the client’s ability level and
                movement quality.
              </p>
            </div>
          </div>

          <div className="actions">
            <button type="button" onClick={addSelectedExerciseToBuilder}>
              Add to Builder
            </button>
            <a href={ROUTES.workoutBuilder.home}>Back to Builder</a>
          </div>

          {builderStatus && <p className="status">{builderStatus}</p>}
        </section>
      </section>

      <style>{`
        .builderDemoPage {
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
          grid-template-columns: 1fr 300px;
          gap: 20px;
          margin-bottom: 20px;
        }

        .eyebrow {
          color: #60a5fa;
          font-size: 12px;
          text-transform: uppercase;
          letter-spacing: .16em;
          font-weight: 900;
        }

        h1 {
          font-size: clamp(40px, 7vw, 70px);
          margin: 10px 0;
        }

        .quickCard,
        .exerciseList,
        .demoPanel,
        .card {
          background: rgba(15,23,42,.75);
          border-radius: 20px;
          padding: 20px;
        }

        .layout {
          display: grid;
          grid-template-columns: 260px 1fr;
          gap: 20px;
        }

        .exerciseList button {
          display: block;
          width: 100%;
          margin-top: 8px;
          padding: 12px;
          border-radius: 12px;
          background: rgba(255,255,255,.05);
          border: none;
          color: white;
          cursor: pointer;
        }

        .exerciseList button.active {
          background: linear-gradient(135deg,#2563eb,#f97316);
        }

        .videoBox {
          height: 300px;
          display: grid;
          place-items: center;
          border-radius: 16px;
          background: rgba(255,255,255,.05);
          margin-bottom: 20px;
        }

        .infoGrid {
          display: grid;
          grid-template-columns: repeat(2,1fr);
          gap: 12px;
        }

        .actions {
          margin-top: 20px;
          display: flex;
          gap: 10px;
        }

        .actions a,
        .actions button {
          padding: 12px 16px;
          border-radius: 12px;
          text-decoration: none;
          font-weight: 900;
          color: white;
          border: 0;
          background: linear-gradient(135deg,#2563eb,#f97316);
          cursor: pointer;
          font: inherit;
        }

        .status {
          color: #bfdbfe;
          font-weight: 800;
          margin-top: 14px;
        }

        @media (max-width: 900px) {
          .hero,
          .layout,
          .infoGrid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </main>
  );
}
