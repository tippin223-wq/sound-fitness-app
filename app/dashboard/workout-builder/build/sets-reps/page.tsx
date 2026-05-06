"use client";

import React, { useState } from "react";

const startingRows = [
  {
    exercise: "Goblet Squat",
    sets: "3",
    reps: "8–10",
    rest: "75 sec",
    tempo: "3-1-1",
  },
  {
    exercise: "Romanian Deadlift",
    sets: "3",
    reps: "8–10",
    rest: "90 sec",
    tempo: "3-1-1",
  },
  {
    exercise: "Split Squat",
    sets: "2",
    reps: "8 / side",
    rest: "60 sec",
    tempo: "2-1-1",
  },
];

export default function SetsRepsPage() {
  const [rows, setRows] = useState(startingRows);

  function updateRow(
    index: number,
    field: keyof (typeof rows)[number],
    value: string,
  ) {
    setRows((current) =>
      current.map((row, rowIndex) =>
        rowIndex === index ? { ...row, [field]: value } : row,
      ),
    );
  }

  return (
    <main className="setsPage">
      <section className="hero">
        <div>
          <p className="eyebrow">Workout Builder</p>
          <h1>Sets / Reps</h1>
          <p>
            Set the training dose: volume, intensity, rest, tempo, and coaching
            notes.
          </p>
        </div>

        <div className="summaryCard">
          <span>{rows.length}</span>
          <h2>Exercises</h2>
          <p>Ready for workout structure</p>
        </div>
      </section>

      <section className="panel">
        <div className="panelHeader">
          <div>
            <p className="eyebrow">Programming</p>
            <h2>Workout Structure</h2>
          </div>
          <a href="/dashboard/workout-builder/build/save">Save Workout</a>
        </div>

        <div className="tableHeader">
          <span>Exercise</span>
          <span>Sets</span>
          <span>Reps</span>
          <span>Rest</span>
          <span>Tempo</span>
        </div>

        <div className="rows">
          {rows.map((row, index) => (
            <div className="row" key={row.exercise}>
              <strong>{row.exercise}</strong>

              <input
                value={row.sets}
                onChange={(e) => updateRow(index, "sets", e.target.value)}
              />

              <input
                value={row.reps}
                onChange={(e) => updateRow(index, "reps", e.target.value)}
              />

              <input
                value={row.rest}
                onChange={(e) => updateRow(index, "rest", e.target.value)}
              />

              <input
                value={row.tempo}
                onChange={(e) => updateRow(index, "tempo", e.target.value)}
              />
            </div>
          ))}
        </div>

        <div className="actions">
          <a href="/dashboard/workout-builder/build/add-exercises">Add Exercises</a>
          <a href="/dashboard/workout-builder/build">Back to Builder</a>
          <a href="/dashboard/workout-builder/build/save">Save</a>
        </div>
      </section>

      <style>{`
        .setsPage {
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
          font-size: 18px;
          line-height: 1.7;
          max-width: 760px;
          margin-top: 18px;
        }

        .summaryCard,
        .panel {
          background: rgba(15,23,42,.76);
          border: 1px solid rgba(148,163,184,.18);
          box-shadow: 0 24px 80px rgba(0,0,0,.35);
          border-radius: 28px;
          backdrop-filter: blur(18px);
          padding: 24px;
        }

        .summaryCard span {
          font-size: 64px;
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

        .panelHeader {
          display: flex;
          justify-content: space-between;
          gap: 16px;
          align-items: center;
          margin-bottom: 18px;
        }

        .panelHeader h2 {
          margin: 0;
          font-size: 30px;
          letter-spacing: -.04em;
        }

        .panelHeader a,
        .actions a {
          color: white;
          text-decoration: none;
          font-weight: 900;
          border-radius: 16px;
          padding: 12px 16px;
          background: linear-gradient(135deg, #f97316, #fb923c);
        }

        .tableHeader,
        .row {
          display: grid;
          grid-template-columns: 1.6fr .7fr .8fr .8fr .8fr;
          gap: 10px;
          align-items: center;
        }

        .tableHeader {
          color: #94a3b8;
          text-transform: uppercase;
          letter-spacing: .08em;
          font-size: 12px;
          font-weight: 900;
          margin-bottom: 10px;
        }

        .rows {
          display: grid;
          gap: 10px;
        }

        .row {
          background: rgba(255,255,255,.055);
          border: 1px solid rgba(148,163,184,.12);
          border-radius: 18px;
          padding: 12px;
        }

        input {
          width: 100%;
          box-sizing: border-box;
          border-radius: 14px;
          border: 1px solid rgba(148,163,184,.18);
          background: rgba(0,0,0,.22);
          color: white;
          padding: 12px;
          outline: none;
          font-family: inherit;
        }

        .actions {
          display: flex;
          gap: 10px;
          flex-wrap: wrap;
          margin-top: 18px;
        }

        .actions a:first-child {
          background: linear-gradient(135deg, #2563eb, #0ea5e9);
        }

        .actions a:nth-child(2) {
          background: rgba(255,255,255,.1);
        }

        @media (max-width: 900px) {
          .hero {
            grid-template-columns: 1fr;
          }

          .panelHeader {
            align-items: flex-start;
            flex-direction: column;
          }
        }

        @media (max-width: 760px) {
          .setsPage {
            padding: 16px;
          }

          .tableHeader {
            display: none;
          }

          .row {
            grid-template-columns: 1fr;
          }

          .panelHeader a,
          .actions a {
            width: 100%;
            text-align: center;
          }
        }
      `}</style>
    </main>
  );
}
