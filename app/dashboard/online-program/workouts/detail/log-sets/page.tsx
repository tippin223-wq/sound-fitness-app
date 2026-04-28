"use client";

import React, { useMemo, useState } from "react";

const exercises = [
  { name: "Goblet Squat", target: "3 sets × 8–10 reps", rest: "75 sec" },
  { name: "Romanian Deadlift", target: "3 sets × 8–10 reps", rest: "90 sec" },
  { name: "Split Squat", target: "2 sets × 8 / side", rest: "60 sec" },
  { name: "Dead Bug", target: "3 sets × 6 / side", rest: "45 sec" },
];

export default function LogSetsPage() {
  const [selected, setSelected] = useState("Goblet Squat");
  const [sets, setSets] = useState([
    { weight: "", reps: "", rpe: "", notes: "" },
    { weight: "", reps: "", rpe: "", notes: "" },
    { weight: "", reps: "", rpe: "", notes: "" },
  ]);

  const completedSets = useMemo(
    () =>
      sets.filter((set) => set.weight || set.reps || set.rpe || set.notes)
        .length,
    [sets],
  );

  function updateSet(
    index: number,
    field: keyof (typeof sets)[number],
    value: string,
  ) {
    setSets((current) =>
      current.map((set, setIndex) =>
        setIndex === index ? { ...set, [field]: value } : set,
      ),
    );
  }

  function addSet() {
    setSets((current) => [
      ...current,
      { weight: "", reps: "", rpe: "", notes: "" },
    ]);
  }

  function clearSets() {
    setSets([{ weight: "", reps: "", rpe: "", notes: "" }]);
  }

  return (
    <main className="logSetsPage">
      <section className="hero">
        <div>
          <p className="eyebrow">Workout Detail</p>
          <h1>Log Sets</h1>
          <p>
            Track weight, reps, effort, and notes. Keep this honest so the next
            workout can progress correctly.
          </p>
        </div>

        <div className="summaryCard">
          <span>{completedSets}</span>
          <h2>Sets Logged</h2>
          <p>{selected}</p>
        </div>
      </section>

      <section className="layout">
        <aside className="exercisePanel">
          <p className="eyebrow">Exercises</p>
          <h2>Select Exercise</h2>

          {exercises.map((exercise) => (
            <button
              key={exercise.name}
              className={selected === exercise.name ? "active" : ""}
              onClick={() => setSelected(exercise.name)}
            >
              <strong>{exercise.name}</strong>
              <span>{exercise.target}</span>
            </button>
          ))}
        </aside>

        <section className="logPanel">
          <div className="panelHeader">
            <div>
              <p className="eyebrow">Logging</p>
              <h2>{selected}</h2>
              <p>
                {
                  exercises.find((exercise) => exercise.name === selected)
                    ?.target
                }
              </p>
            </div>

            <a href="/online-program/workouts/detail/complete">
              Finish Workout
            </a>
          </div>

          <div className="tableHeader">
            <span>Set</span>
            <span>Weight</span>
            <span>Reps</span>
            <span>RPE</span>
            <span>Notes</span>
          </div>

          <div className="setRows">
            {sets.map((set, index) => (
              <div className="setRow" key={index}>
                <strong>{index + 1}</strong>

                <input
                  value={set.weight}
                  onChange={(event) =>
                    updateSet(index, "weight", event.target.value)
                  }
                  placeholder="lbs"
                />

                <input
                  value={set.reps}
                  onChange={(event) =>
                    updateSet(index, "reps", event.target.value)
                  }
                  placeholder="reps"
                />

                <input
                  value={set.rpe}
                  onChange={(event) =>
                    updateSet(index, "rpe", event.target.value)
                  }
                  placeholder="1-10"
                />

                <input
                  value={set.notes}
                  onChange={(event) =>
                    updateSet(index, "notes", event.target.value)
                  }
                  placeholder="form, pain, energy..."
                />
              </div>
            ))}
          </div>

          <div className="actions">
            <button onClick={addSet}>Add Set</button>
            <button onClick={clearSets}>Clear</button>
            <a href="/online-program/workouts/detail">Back to Workout</a>
          </div>

          <div className="coachBox">
            <h2>Best Practice</h2>
            <p>
              Log the set you actually performed, not the set you hoped to
              perform. This is how the program gets smarter.
            </p>
          </div>
        </section>
      </section>

      <style>{`
        .logSetsPage {
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
          grid-template-columns: 1fr 310px;
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

        .summaryCard,
        .exercisePanel,
        .logPanel,
        .coachBox {
          background: rgba(15,23,42,.76);
          border: 1px solid rgba(148,163,184,.18);
          box-shadow: 0 24px 80px rgba(0,0,0,.35);
          border-radius: 28px;
          backdrop-filter: blur(18px);
        }

        .summaryCard {
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
          margin: 0;
          color: #94a3b8;
        }

        .layout {
          display: grid;
          grid-template-columns: 320px 1fr;
          gap: 20px;
          align-items: start;
        }

        .exercisePanel,
        .logPanel {
          padding: 24px;
        }

        .exercisePanel {
          display: grid;
          gap: 10px;
          position: sticky;
          top: 20px;
        }

        .exercisePanel h2,
        .panelHeader h2,
        .coachBox h2 {
          margin: 0;
          font-size: 28px;
          letter-spacing: -.04em;
        }

        .exercisePanel button {
          border: 1px solid rgba(148,163,184,.14);
          background: rgba(255,255,255,.055);
          color: white;
          border-radius: 18px;
          padding: 14px;
          text-align: left;
          cursor: pointer;
          display: grid;
          gap: 5px;
        }

        .exercisePanel button.active,
        .exercisePanel button:hover {
          border-color: rgba(249,115,22,.55);
          background: rgba(249,115,22,.14);
        }

        .exercisePanel span {
          color: #94a3b8;
          font-size: 14px;
        }

        .panelHeader {
          display: flex;
          justify-content: space-between;
          gap: 18px;
          align-items: start;
          margin-bottom: 20px;
        }

        .panelHeader p {
          color: #94a3b8;
          margin: 8px 0 0;
        }

        .panelHeader a,
        .actions a,
        .actions button {
          color: white;
          text-decoration: none;
          font-weight: 900;
          border-radius: 16px;
          padding: 12px 16px;
          border: 0;
          cursor: pointer;
          background: linear-gradient(135deg, #f97316, #fb923c);
          font-family: inherit;
        }

        .tableHeader,
        .setRow {
          display: grid;
          grid-template-columns: 60px 1fr 1fr 1fr 2fr;
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

        .setRows {
          display: grid;
          gap: 10px;
        }

        .setRow {
          background: rgba(255,255,255,.055);
          border: 1px solid rgba(148,163,184,.12);
          border-radius: 18px;
          padding: 12px;
        }

        .setRow strong {
          color: #bfdbfe;
        }

        input {
          width: 100%;
          box-sizing: border-box;
          border-radius: 13px;
          border: 1px solid rgba(148,163,184,.18);
          background: rgba(0,0,0,.22);
          color: white;
          padding: 12px;
          outline: none;
          font-family: inherit;
        }

        input::placeholder {
          color: #64748b;
        }

        .actions {
          display: flex;
          gap: 10px;
          flex-wrap: wrap;
          margin-top: 18px;
        }

        .actions button:first-child {
          background: linear-gradient(135deg, #2563eb, #0ea5e9);
        }

        .actions button:nth-child(2) {
          background: rgba(255,255,255,.1);
        }

        .actions a {
          background: rgba(255,255,255,.1);
        }

        .coachBox {
          padding: 20px;
          margin-top: 18px;
          box-shadow: none;
        }

        .coachBox p {
          color: #cbd5e1;
          line-height: 1.6;
          margin-bottom: 0;
        }

        @media (max-width: 1000px) {
          .hero,
          .layout {
            grid-template-columns: 1fr;
          }

          .exercisePanel {
            position: static;
          }
        }

        @media (max-width: 760px) {
          .logSetsPage {
            padding: 16px;
          }

          .tableHeader {
            display: none;
          }

          .setRow {
            grid-template-columns: 1fr;
          }

          .panelHeader {
            flex-direction: column;
          }

          .panelHeader a,
          .actions a,
          .actions button {
            width: 100%;
            text-align: center;
          }
        }
      `}</style>
    </main>
  );
}
