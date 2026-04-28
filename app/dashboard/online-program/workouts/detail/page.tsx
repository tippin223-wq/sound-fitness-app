"use client";

import React, { useState } from "react";

const exercises = [
  {
    name: "Goblet Squat",
    sets: "3",
    reps: "8–10",
    rest: "75 sec",
    tempo: "3-1-1",
    focus: "Control depth, brace core, drive through full foot.",
    href: "/online-program/workouts/detail/exercise-demo",
  },
  {
    name: "Romanian Deadlift",
    sets: "3",
    reps: "8–10",
    rest: "90 sec",
    tempo: "3-1-1",
    focus: "Hips back, soft knees, neutral spine, feel hamstrings.",
    href: "/online-program/workouts/detail/exercise-demo",
  },
  {
    name: "Split Squat",
    sets: "2",
    reps: "8 / side",
    rest: "60 sec",
    tempo: "2-1-1",
    focus: "Stay tall, control knee path, smooth reps.",
    href: "/online-program/workouts/detail/exercise-demo",
  },
  {
    name: "Dead Bug",
    sets: "3",
    reps: "6 / side",
    rest: "45 sec",
    tempo: "Slow",
    focus: "Brace ribs down, move slow, avoid arching low back.",
    href: "/online-program/workouts/detail/exercise-demo",
  },
];

export default function WorkoutDetailPage() {
  const [checked, setChecked] = useState<Record<string, boolean>>({});

  const completed = exercises.filter(
    (exercise) => checked[exercise.name],
  ).length;
  const percent = Math.round((completed / exercises.length) * 100);

  function toggleExercise(name: string) {
    setChecked((current) => ({
      ...current,
      [name]: !current[name],
    }));
  }

  return (
    <main className="workoutDetailPage">
      <section className="hero">
        <div>
          <p className="eyebrow">Program Workout</p>
          <h1>Lower Body Foundation</h1>
          <p>
            Build lower-body strength with clean movement, controlled tempo, and
            honest logging. Finish each exercise before moving forward.
          </p>

          <div className="heroActions">
            <a href="/online-program/workouts/detail/log-sets">Log Sets</a>
            <a href="/online-program/workouts/detail/complete">
              Complete Workout
            </a>
          </div>
        </div>

        <div className="progressCard">
          <span>{percent}%</span>
          <h2>Workout Progress</h2>
          <div className="progressBar">
            <div style={{ width: `${percent}%` }} />
          </div>
          <small>
            {completed} of {exercises.length} exercises checked
          </small>
        </div>
      </section>

      <section className="layout">
        <section className="exercisePanel">
          <div className="panelHeader">
            <div>
              <p className="eyebrow">Workout Plan</p>
              <h2>Exercises</h2>
            </div>
            <a href="/online-program/workouts">Back to Workouts</a>
          </div>

          <div className="exerciseList">
            {exercises.map((exercise, index) => (
              <article className="exerciseCard" key={exercise.name}>
                <div className="exerciseTop">
                  <div className="number">{index + 1}</div>

                  <div className="exerciseTitle">
                    <h3>{exercise.name}</h3>
                    <p>{exercise.focus}</p>
                  </div>

                  <input
                    type="checkbox"
                    checked={Boolean(checked[exercise.name])}
                    onChange={() => toggleExercise(exercise.name)}
                  />
                </div>

                <div className="detailsGrid">
                  <div>
                    <span>Sets</span>
                    <strong>{exercise.sets}</strong>
                  </div>
                  <div>
                    <span>Reps</span>
                    <strong>{exercise.reps}</strong>
                  </div>
                  <div>
                    <span>Rest</span>
                    <strong>{exercise.rest}</strong>
                  </div>
                  <div>
                    <span>Tempo</span>
                    <strong>{exercise.tempo}</strong>
                  </div>
                </div>

                <div className="cardActions">
                  <a href={exercise.href}>View Demo</a>
                  <a href="/online-program/workouts/detail/log-sets">
                    Log This Exercise
                  </a>
                </div>
              </article>
            ))}
          </div>
        </section>

        <aside className="sidePanel">
          <div className="coachCard">
            <p className="eyebrow">Coach Cues</p>
            <h2>Today’s Focus</h2>
            <ul>
              <li>Move slow enough to own the position.</li>
              <li>Stop sets before form breaks down.</li>
              <li>Log weight honestly, not optimistically.</li>
              <li>Pain changes the plan — do not force reps.</li>
            </ul>
          </div>

          <div className="notesCard">
            <h2>Workout Notes</h2>
            <textarea placeholder="How did this workout feel? Energy, soreness, pain, wins..." />
          </div>

          <div className="quickLinks">
            <h2>Next Steps</h2>
            <a href="/online-program/workouts/detail/exercise-demo">
              Exercise Demo
            </a>
            <a href="/online-program/workouts/detail/log-sets">Log Sets</a>
            <a href="/online-program/workouts/detail/complete">
              Complete Workout
            </a>
          </div>
        </aside>
      </section>

      <style>{`
        .workoutDetailPage {
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

        .eyebrow {
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

        .heroActions {
          display: flex;
          gap: 12px;
          margin-top: 24px;
          flex-wrap: wrap;
        }

        .heroActions a,
        .panelHeader a,
        .cardActions a,
        .quickLinks a {
          color: white;
          text-decoration: none;
          font-weight: 900;
          border-radius: 16px;
          padding: 12px 16px;
          background: linear-gradient(135deg, #2563eb, #0ea5e9);
        }

        .heroActions a:last-child,
        .cardActions a:last-child {
          background: linear-gradient(135deg, #f97316, #fb923c);
        }

        .progressCard,
        .exercisePanel,
        .coachCard,
        .notesCard,
        .quickLinks {
          background: rgba(15,23,42,.76);
          border: 1px solid rgba(148,163,184,.18);
          box-shadow: 0 24px 80px rgba(0,0,0,.35);
          border-radius: 28px;
          backdrop-filter: blur(18px);
        }

        .progressCard {
          padding: 24px;
        }

        .progressCard span {
          font-size: 58px;
          font-weight: 950;
          letter-spacing: -.07em;
        }

        .progressCard h2 {
          margin: 4px 0 16px;
        }

        .progressBar {
          height: 12px;
          border-radius: 999px;
          background: rgba(255,255,255,.08);
          overflow: hidden;
        }

        .progressBar div {
          height: 100%;
          background: linear-gradient(90deg, #2563eb, #38bdf8, #f97316);
        }

        .progressCard small {
          color: #94a3b8;
          display: block;
          margin-top: 12px;
        }

        .layout {
          display: grid;
          grid-template-columns: 1fr 340px;
          gap: 20px;
          align-items: start;
        }

        .exercisePanel,
        .coachCard,
        .notesCard,
        .quickLinks {
          padding: 24px;
        }

        .panelHeader {
          display: flex;
          justify-content: space-between;
          gap: 16px;
          align-items: center;
          margin-bottom: 18px;
        }

        .panelHeader h2,
        .coachCard h2,
        .notesCard h2,
        .quickLinks h2 {
          margin: 0;
          font-size: 28px;
          letter-spacing: -.04em;
        }

        .exerciseList {
          display: grid;
          gap: 14px;
        }

        .exerciseCard {
          background: rgba(255,255,255,.055);
          border: 1px solid rgba(148,163,184,.14);
          border-radius: 24px;
          padding: 18px;
        }

        .exerciseCard:hover {
          border-color: rgba(96,165,250,.45);
          background: rgba(255,255,255,.08);
        }

        .exerciseTop {
          display: grid;
          grid-template-columns: 46px 1fr 28px;
          gap: 14px;
          align-items: start;
        }

        .number {
          width: 42px;
          height: 42px;
          display: grid;
          place-items: center;
          border-radius: 14px;
          background: rgba(37,99,235,.18);
          color: #bfdbfe;
          font-weight: 950;
        }

        .exerciseTitle h3 {
          margin: 0 0 6px;
          font-size: 22px;
        }

        .exerciseTitle p {
          margin: 0;
          color: #cbd5e1;
          line-height: 1.55;
        }

        input[type="checkbox"] {
          width: 22px;
          height: 22px;
          accent-color: #f97316;
          margin-top: 8px;
        }

        .detailsGrid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 10px;
          margin: 16px 0;
        }

        .detailsGrid div {
          background: rgba(0,0,0,.22);
          border: 1px solid rgba(148,163,184,.1);
          border-radius: 16px;
          padding: 12px;
          display: grid;
          gap: 4px;
        }

        .detailsGrid span {
          color: #94a3b8;
          font-size: 12px;
          font-weight: 800;
          text-transform: uppercase;
          letter-spacing: .08em;
        }

        .detailsGrid strong {
          color: #f8fafc;
        }

        .cardActions {
          display: flex;
          gap: 10px;
          flex-wrap: wrap;
        }

        .sidePanel {
          display: grid;
          gap: 16px;
        }

        ul {
          margin: 14px 0 0;
          padding-left: 20px;
          color: #cbd5e1;
          line-height: 1.75;
        }

        textarea {
          width: 100%;
          min-height: 140px;
          resize: vertical;
          box-sizing: border-box;
          border-radius: 18px;
          border: 1px solid rgba(148,163,184,.18);
          background: rgba(255,255,255,.06);
          color: white;
          padding: 14px;
          font-family: inherit;
          outline: none;
          margin-top: 14px;
        }

        textarea::placeholder {
          color: #94a3b8;
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
          .layout {
            grid-template-columns: 1fr;
          }

          .panelHeader {
            align-items: flex-start;
            flex-direction: column;
          }
        }

        @media (max-width: 700px) {
          .workoutDetailPage {
            padding: 16px;
          }

          .detailsGrid {
            grid-template-columns: repeat(2, 1fr);
          }

          .exerciseTop {
            grid-template-columns: 42px 1fr;
          }

          .exerciseTop input {
            grid-column: 1 / -1;
          }

          .heroActions a,
          .panelHeader a,
          .cardActions a {
            width: 100%;
            text-align: center;
          }
        }
      `}</style>
    </main>
  );
}
