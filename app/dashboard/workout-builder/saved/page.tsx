"use client";

import React from "react";

const savedWorkouts = [
  {
    title: "Lower Body Strength Template",
    goal: "Squat, hinge, glutes, hamstrings, core brace",
    level: "Beginner / Intermediate",
    time: "45–55 min",
    exercises: 3,
    href: "/dashboard/workout-builder/saved/detail",
  },
  {
    title: "Upper Body Foundation",
    goal: "Push, pull, posture, shoulders, trunk control",
    level: "Beginner",
    time: "40–50 min",
    exercises: 5,
    href: "/dashboard/workout-builder/saved/detail",
  },
  {
    title: "Full Body Conditioning",
    goal: "Strength endurance, carries, core, movement quality",
    level: "Intermediate",
    time: "35–45 min",
    exercises: 6,
    href: "/dashboard/workout-builder/saved/detail",
  },
];

export default function SavedWorkoutsPage() {
  return (
    <main className="savedPage">
      <section className="hero">
        <div>
          <p className="eyebrow">Workout Builder</p>
          <h1>Saved Workouts</h1>
          <p>
            Reuse, edit, duplicate, and assign workouts without rebuilding from
            scratch every time.
          </p>
        </div>

        <div className="summaryCard">
          <span>{savedWorkouts.length}</span>
          <h2>Saved Templates</h2>
          <p>Ready to reuse or assign</p>
        </div>
      </section>

      <section className="toolbar">
        <input placeholder="Search saved workouts..." />
        <a href="/dashboard/workout-builder/build">Build New Workout</a>
      </section>

      <section className="grid">
        {savedWorkouts.map((workout) => (
          <a className="card" href={workout.href} key={workout.title}>
            <div className="topLine">
              <span>{workout.level}</span>
              <strong>→</strong>
            </div>

            <h2>{workout.title}</h2>
            <p>{workout.goal}</p>

            <div className="meta">
              <div>
                <span>Time</span>
                <strong>{workout.time}</strong>
              </div>
              <div>
                <span>Exercises</span>
                <strong>{workout.exercises}</strong>
              </div>
            </div>
          </a>
        ))}
      </section>

      <section className="bottomPanel">
        <div>
          <p className="eyebrow">Best Practice</p>
          <h2>Templates should save you time, not trap you.</h2>
          <p>
            Keep saved workouts clean and reusable. Duplicate first, then
            customize for a client, goal, equipment setup, or training phase.
          </p>
        </div>

        <div className="quickLinks">
          <a href="/dashboard/workout-builder">Builder Home</a>
          <a href="/dashboard/workout-builder/exercise-library">Exercise Library</a>
          <a href="/dashboard/workout-builder/build/save">Save Workout</a>
        </div>
      </section>

      <style>{`
        .savedPage {
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
          grid-template-columns: 1fr 320px;
          gap: 22px;
          margin-bottom: 22px;
        }

        .eyebrow {
          color: #60a5fa;
          text-transform: uppercase;
          letter-spacing: .16em;
          font-size: 12px;
          font-weight: 900;
          margin: 0 0 10px;
        }

        h1 {
          font-size: clamp(44px, 8vw, 88px);
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

        .summaryCard,
        .card,
        .bottomPanel {
          background: rgba(15,23,42,.76);
          border: 1px solid rgba(148,163,184,.18);
          box-shadow: 0 24px 80px rgba(0,0,0,.35);
          border-radius: 28px;
          backdrop-filter: blur(18px);
          padding: 24px;
        }

        .summaryCard span {
          font-size: 68px;
          font-weight: 950;
          letter-spacing: -.07em;
        }

        .summaryCard h2 {
          margin: 4px 0 8px;
        }

        .summaryCard p {
          color: #94a3b8;
          margin: 0;
        }

        .toolbar {
          display: flex;
          gap: 12px;
          margin-bottom: 18px;
        }

        .toolbar input {
          flex: 1;
          border-radius: 16px;
          border: 1px solid rgba(148,163,184,.18);
          background: rgba(0,0,0,.22);
          color: white;
          padding: 14px;
          outline: none;
          font-family: inherit;
        }

        .toolbar input::placeholder {
          color: #94a3b8;
        }

        .toolbar a,
        .quickLinks a {
          color: white;
          text-decoration: none;
          font-weight: 900;
          border-radius: 16px;
          padding: 14px 16px;
          background: linear-gradient(135deg, #f97316, #fb923c);
          white-space: nowrap;
        }

        .grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 16px;
          margin-bottom: 22px;
        }

        .card {
          color: white;
          text-decoration: none;
        }

        .card:hover {
          transform: translateY(-2px);
          border-color: rgba(249,115,22,.45);
        }

        .topLine {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 18px;
        }

        .topLine span {
          color: #bfdbfe;
          background: rgba(37,99,235,.16);
          padding: 7px 10px;
          border-radius: 999px;
          font-size: 12px;
          font-weight: 900;
        }

        .topLine strong {
          color: #f97316;
          font-size: 24px;
        }

        .card h2 {
          margin: 0 0 10px;
          font-size: 24px;
          letter-spacing: -.04em;
        }

        .card p,
        .bottomPanel p {
          color: #cbd5e1;
          line-height: 1.6;
        }

        .meta {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 10px;
          margin-top: 18px;
        }

        .meta div {
          background: rgba(255,255,255,.055);
          border: 1px solid rgba(148,163,184,.12);
          border-radius: 16px;
          padding: 12px;
          display: grid;
          gap: 4px;
        }

        .meta span {
          color: #94a3b8;
          font-size: 12px;
          text-transform: uppercase;
          letter-spacing: .08em;
          font-weight: 900;
        }

        .bottomPanel {
          display: grid;
          grid-template-columns: 1fr 360px;
          gap: 20px;
          align-items: center;
        }

        .bottomPanel h2 {
          margin: 0;
          font-size: 30px;
          letter-spacing: -.04em;
        }

        .quickLinks {
          display: grid;
          gap: 10px;
        }

        .quickLinks a {
          background: rgba(255,255,255,.055);
          border: 1px solid rgba(148,163,184,.12);
        }

        .quickLinks a:hover {
          border-color: rgba(249,115,22,.45);
        }

        @media (max-width: 1000px) {
          .hero,
          .grid,
          .bottomPanel {
            grid-template-columns: 1fr;
          }

          .toolbar {
            flex-direction: column;
          }

          .toolbar a {
            text-align: center;
          }
        }

        @media (max-width: 640px) {
          .savedPage {
            padding: 16px;
          }
        }
      `}</style>
    </main>
  );
}
