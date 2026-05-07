"use client";

import React from "react";
import { ROUTES } from "@/lib/routes";

const workout = [
  {
    exercise: "Goblet Squat",
    sets: "3",
    reps: "8–10",
    rest: "75 sec",
    tempo: "3-1-1",
    notes: "Brace hard, control depth",
  },
  {
    exercise: "Romanian Deadlift",
    sets: "3",
    reps: "8–10",
    rest: "90 sec",
    tempo: "3-1-1",
    notes: "Hips back, keep tension",
  },
  {
    exercise: "Split Squat",
    sets: "2",
    reps: "8 / side",
    rest: "60 sec",
    tempo: "2-1-1",
    notes: "Stay tall, smooth reps",
  },
];

export default function SavedWorkoutDetailPage() {
  return (
    <main className="detailPage">
      {/* HERO */}
      <section className="hero">
        <div>
          <p className="eyebrow">Saved Workouts</p>
          <h1>Workout Detail</h1>
          <p>
            Review this template, duplicate it, edit it, or assign it to a
            program or client.
          </p>
        </div>

        <div className="summaryCard">
          <span>{workout.length}</span>
          <h2>Exercises</h2>
          <p>Lower Body Strength Template</p>
        </div>
      </section>

      {/* MAIN */}
      <section className="layout">
        <section className="mainPanel">
          <div className="panelHeader">
            <div>
              <p className="eyebrow">Template</p>
              <h2>Lower Body Strength Template</h2>
            </div>
            <a href="/dashboard/workout-builder/saved">Back</a>
          </div>

          {/* META */}
          <div className="metaGrid">
            <div>
              <span>Goal</span>
              <strong>Lower Body Strength</strong>
            </div>
            <div>
              <span>Level</span>
              <strong>Beginner / Intermediate</strong>
            </div>
            <div>
              <span>Duration</span>
              <strong>45–55 min</strong>
            </div>
          </div>

          {/* WORKOUT TABLE */}
          <div className="tableHeader">
            <span>Exercise</span>
            <span>Sets</span>
            <span>Reps</span>
            <span>Rest</span>
            <span>Tempo</span>
          </div>

          <div className="rows">
            {workout.map((row, index) => (
              <div className="row" key={row.exercise}>
                <strong>
                  {index + 1}. {row.exercise}
                </strong>
                <span>{row.sets}</span>
                <span>{row.reps}</span>
                <span>{row.rest}</span>
                <span>{row.tempo}</span>
                <p className="notes">{row.notes}</p>
              </div>
            ))}
          </div>

          {/* ACTIONS */}
          <div className="actions">
            <a href="/dashboard/workout-builder/build">Edit</a>
            <a href="/dashboard/workout-builder/build/save">Duplicate</a>
            <a href={ROUTES.dashboard.sessionWorkout}>Start</a>
          </div>
        </section>

        {/* SIDE */}
        <aside className="sidePanel">
          <div className="coachCard">
            <p className="eyebrow">Best Practice</p>
            <h2>Use templates smart</h2>
            <ul>
              <li>Duplicate before editing</li>
              <li>Keep originals clean</li>
              <li>Write clear coaching notes</li>
              <li>Think in systems, not workouts</li>
            </ul>
          </div>

          <div className="quickLinks">
            <h2>Quick Links</h2>
            <a href="/dashboard/workout-builder">Builder</a>
            <a href="/dashboard/workout-builder/build">Build</a>
            <a href="/dashboard/workout-builder/exercise-library">Library</a>
          </div>
        </aside>
      </section>

      <style>{`
        .detailPage {
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
        }

        h1 {
          font-size: clamp(44px, 8vw, 88px);
          margin: 10px 0;
        }

        .hero p {
          color: #cbd5e1;
        }

        .summaryCard,
        .mainPanel,
        .coachCard,
        .quickLinks {
          background: rgba(15,23,42,.75);
          border-radius: 22px;
          padding: 20px;
        }

        .summaryCard span {
          font-size: 60px;
          font-weight: 900;
        }

        .layout {
          display: grid;
          grid-template-columns: 1fr 320px;
          gap: 20px;
        }

        .panelHeader {
          display: flex;
          justify-content: space-between;
          margin-bottom: 16px;
        }

        .metaGrid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 10px;
          margin-bottom: 16px;
        }

        .metaGrid div {
          background: rgba(255,255,255,.05);
          padding: 12px;
          border-radius: 12px;
        }

        .tableHeader,
        .row {
          display: grid;
          grid-template-columns: 1.5fr .6fr .8fr .8fr .8fr;
          gap: 10px;
        }

        .tableHeader {
          font-size: 12px;
          color: #94a3b8;
          margin-bottom: 8px;
        }

        .row {
          background: rgba(255,255,255,.05);
          padding: 12px;
          border-radius: 14px;
          margin-bottom: 8px;
        }

        .notes {
          grid-column: span 5;
          color: #94a3b8;
          font-size: 13px;
        }

        .actions {
          margin-top: 16px;
          display: flex;
          gap: 10px;
        }

        .actions a {
          padding: 10px 14px;
          background: linear-gradient(135deg,#2563eb,#f97316);
          color: white;
          text-decoration: none;
          border-radius: 10px;
        }

        .sidePanel {
          display: grid;
          gap: 14px;
        }

        ul {
          padding-left: 18px;
          color: #cbd5e1;
        }

        .quickLinks a {
          display: block;
          margin-top: 6px;
          padding: 10px;
          background: rgba(255,255,255,.05);
          border-radius: 10px;
          text-decoration: none;
          color: white;
        }

        @media (max-width: 900px) {
          .hero,
          .layout,
          .metaGrid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </main>
  );
}
