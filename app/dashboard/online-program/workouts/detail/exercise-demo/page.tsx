"use client";

import React, { useState } from "react";

const exercises = [
  "Goblet Squat",
  "Romanian Deadlift",
  "Split Squat",
  "Dead Bug",
];

export default function ExerciseDemoPage() {
  const [selectedExercise, setSelectedExercise] = useState("Goblet Squat");

  return (
    <main className="demoPage">
      <section className="hero">
        <div>
          <p className="eyebrow">Workout Detail</p>
          <h1>Exercise Demo</h1>
          <p>
            Watch the movement, read the coaching cues, avoid common mistakes,
            then return to your workout and log the exercise.
          </p>
        </div>

        <div className="quickCard">
          <p className="label">Selected Exercise</p>
          <h2>{selectedExercise}</h2>
          <p>Demo, cues, mistakes, modifications, and logging shortcut.</p>
        </div>
      </section>

      <section className="layout">
        <aside className="exerciseList">
          <p className="eyebrow">Exercises</p>
          <h2>This Workout</h2>

          {exercises.map((exercise) => (
            <button
              key={exercise}
              onClick={() => setSelectedExercise(exercise)}
              className={selectedExercise === exercise ? "active" : ""}
            >
              {exercise}
            </button>
          ))}
        </aside>

        <section className="demoPanel">
          <div className="videoBox">
            <div>
              <span>▶</span>
              <p>Exercise Demo Video Placeholder</p>
              <small>Add Joey’s real video later</small>
            </div>
          </div>

          <div className="infoGrid">
            <div className="infoCard">
              <h2>Coach Cues</h2>
              <ul>
                <li>Start with control before adding load.</li>
                <li>Brace your core before each rep.</li>
                <li>Move through a pain-free range.</li>
                <li>Keep the tempo smooth and repeatable.</li>
              </ul>
            </div>

            <div className="infoCard">
              <h2>Common Mistakes</h2>
              <ul>
                <li>Rushing the lowering phase.</li>
                <li>Losing position to chase more weight.</li>
                <li>Holding breath too long.</li>
                <li>Ignoring pain or sharp discomfort.</li>
              </ul>
            </div>

            <div className="infoCard">
              <h2>Modification</h2>
              <p>
                Reduce range of motion, lower the weight, slow the tempo, or
                switch to a more stable variation if form breaks down.
              </p>
            </div>

            <div className="infoCard">
              <h2>Best Practice</h2>
              <p>
                Keep demos short. Clients need the key cues fast, then they need
                to get back to the workout.
              </p>
            </div>
          </div>

          <div className="actions">
            <a href="/dashboard/online-program/workouts/detail">Back to Workout</a>
            <a href="/dashboard/online-program/workouts/detail/log-sets">Log Sets</a>
          </div>
        </section>
      </section>

      <style>{`
        .demoPage {
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
          grid-template-columns: 1fr 330px;
          gap: 22px;
          margin-bottom: 22px;
        }

        .eyebrow,
        .label {
          color: #60a5fa;
          text-transform: uppercase;
          letter-spacing: .16em;
          font-size: 12px;
          font-weight: 900;
          margin: 0 0 10px;
        }

        h1 {
          font-size: clamp(42px, 8vw, 86px);
          line-height: .9;
          letter-spacing: -.07em;
          margin: 0;
        }

        .hero p {
          color: #cbd5e1;
          max-width: 760px;
          font-size: 18px;
          line-height: 1.7;
          margin-top: 18px;
        }

        .quickCard,
        .exerciseList,
        .demoPanel,
        .infoCard {
          background: rgba(15,23,42,.76);
          border: 1px solid rgba(148,163,184,.18);
          box-shadow: 0 24px 80px rgba(0,0,0,.35);
          border-radius: 28px;
          backdrop-filter: blur(18px);
        }

        .quickCard,
        .exerciseList,
        .demoPanel {
          padding: 24px;
        }

        .quickCard h2,
        .exerciseList h2,
        .infoCard h2 {
          margin: 0 0 12px;
          font-size: 28px;
          letter-spacing: -.04em;
        }

        .quickCard p {
          color: #cbd5e1;
          line-height: 1.6;
        }

        .layout {
          display: grid;
          grid-template-columns: 310px 1fr;
          gap: 20px;
          align-items: start;
        }

        .exerciseList {
          display: grid;
          gap: 10px;
          position: sticky;
          top: 20px;
        }

        .exerciseList button {
          border: 1px solid rgba(148,163,184,.14);
          background: rgba(255,255,255,.055);
          color: white;
          border-radius: 18px;
          padding: 14px;
          text-align: left;
          font-weight: 900;
          cursor: pointer;
        }

        .exerciseList button:hover,
        .exerciseList button.active {
          border-color: rgba(249,115,22,.55);
          background: rgba(249,115,22,.14);
        }

        .videoBox {
          min-height: 360px;
          border-radius: 24px;
          background:
            linear-gradient(135deg, rgba(37,99,235,.18), rgba(249,115,22,.12)),
            rgba(255,255,255,.055);
          border: 1px solid rgba(148,163,184,.14);
          display: grid;
          place-items: center;
          text-align: center;
          margin-bottom: 18px;
        }

        .videoBox span {
          width: 74px;
          height: 74px;
          display: grid;
          place-items: center;
          margin: 0 auto 14px;
          border-radius: 999px;
          background: linear-gradient(135deg, #2563eb, #f97316);
          font-size: 30px;
        }

        .videoBox p {
          margin: 0;
          font-size: 22px;
          font-weight: 950;
        }

        .videoBox small {
          color: #94a3b8;
          display: block;
          margin-top: 8px;
        }

        .infoGrid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 14px;
        }

        .infoCard {
          padding: 20px;
          box-shadow: none;
        }

        .infoCard p,
        .infoCard li {
          color: #cbd5e1;
          line-height: 1.7;
        }

        ul {
          margin: 0;
          padding-left: 20px;
        }

        .actions {
          display: flex;
          gap: 12px;
          margin-top: 18px;
          flex-wrap: wrap;
        }

        .actions a {
          color: white;
          text-decoration: none;
          font-weight: 900;
          border-radius: 16px;
          padding: 13px 17px;
          background: linear-gradient(135deg, #2563eb, #0ea5e9);
        }

        .actions a:last-child {
          background: linear-gradient(135deg, #f97316, #fb923c);
        }

        @media (max-width: 1000px) {
          .hero,
          .layout,
          .infoGrid {
            grid-template-columns: 1fr;
          }

          .exerciseList {
            position: static;
          }
        }

        @media (max-width: 640px) {
          .demoPage {
            padding: 16px;
          }

          .actions a {
            width: 100%;
            text-align: center;
          }
        }
      `}</style>
    </main>
  );
}
