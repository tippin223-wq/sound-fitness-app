"use client";

import React, { useState } from "react";

const exercises = ["Squat", "Bench Press", "Deadlift", "Row", "Shoulder Press"];

export default function BuilderExerciseDemoPage() {
  const [selected, setSelected] = useState("Squat");

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
          <h2>{selected}</h2>
          <p>Movement demo, cues, mistakes, and programming notes.</p>
        </div>
      </section>

      <section className="layout">
        <aside className="exerciseList">
          <h2>Exercises</h2>

          {exercises.map((ex) => (
            <button
              key={ex}
              onClick={() => setSelected(ex)}
              className={selected === ex ? "active" : ""}
            >
              {ex}
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
                <li>Stay controlled</li>
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
            <a href="/dashboard/workout-builder/build">Add to Workout</a>
            <a href="/dashboard/workout-builder">Back to Builder</a>
          </div>
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

        .actions a {
          padding: 12px 16px;
          border-radius: 12px;
          text-decoration: none;
          font-weight: 900;
          color: white;
          background: linear-gradient(135deg,#2563eb,#f97316);
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
