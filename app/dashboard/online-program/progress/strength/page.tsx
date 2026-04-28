"use client";

import React from "react";

const lifts = [
  {
    lift: "Goblet Squat",
    start: "35 lb",
    current: "45 lb",
    best: "50 lb",
    change: "+10 lb",
  },
  {
    lift: "Romanian Deadlift",
    start: "50 lb",
    current: "65 lb",
    best: "70 lb",
    change: "+15 lb",
  },
  {
    lift: "Push-Up",
    start: "Incline",
    current: "Lower Incline",
    best: "Floor Negative",
    change: "Harder",
  },
  {
    lift: "Row",
    start: "30 lb",
    current: "40 lb",
    best: "45 lb",
    change: "+10 lb",
  },
];

export default function StrengthTrackingPage() {
  return (
    <main className="strengthPage">
      <section className="hero">
        <div>
          <p className="eyebrow">Program Progress</p>
          <h1>Strength Tracking</h1>
          <p>
            Track key movements across the phase so strength progress is
            visible, simple, and useful.
          </p>
        </div>

        <div className="scoreCard">
          <span>+8%</span>
          <h2>Strength Trend</h2>
          <p>Estimated improvement this phase</p>
        </div>
      </section>

      <section className="layout">
        <section className="mainPanel">
          <div className="panelHeader">
            <div>
              <p className="eyebrow">Key Lifts</p>
              <h2>Movement Progress</h2>
            </div>
            <a href="/online-program/progress">Back to Progress</a>
          </div>

          <div className="table">
            <div className="row head">
              <span>Movement</span>
              <span>Start</span>
              <span>Current</span>
              <span>Best</span>
              <span>Change</span>
            </div>

            {lifts.map((item) => (
              <div className="row" key={item.lift}>
                <strong>{item.lift}</strong>
                <span>{item.start}</span>
                <span>{item.current}</span>
                <span>{item.best}</span>
                <em>{item.change}</em>
              </div>
            ))}
          </div>
        </section>

        <aside className="sidePanel">
          <div className="coachCard">
            <p className="eyebrow">Coach Insight</p>
            <h2>What counts?</h2>
            <ul>
              <li>More weight with good form</li>
              <li>More reps at the same weight</li>
              <li>Better range of motion</li>
              <li>Harder variation with control</li>
              <li>Less pain at the same movement</li>
            </ul>
          </div>

          <div className="quickLinks">
            <h2>Progress Pages</h2>
            <a href="/online-program/progress/completion">Completion %</a>
            <a href="/online-program/progress/streak">Streak</a>
            <a href="/online-program/workouts">Program Workouts</a>
          </div>
        </aside>
      </section>

      <style>{`
        .strengthPage {
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

        .scoreCard,
        .mainPanel,
        .coachCard,
        .quickLinks {
          background: rgba(15,23,42,.76);
          border: 1px solid rgba(148,163,184,.18);
          box-shadow: 0 24px 80px rgba(0,0,0,.35);
          border-radius: 28px;
          backdrop-filter: blur(18px);
          padding: 24px;
        }

        .scoreCard span {
          font-size: 62px;
          font-weight: 950;
          letter-spacing: -.07em;
        }

        .scoreCard h2 {
          margin: 4px 0 8px;
        }

        .layout {
          display: grid;
          grid-template-columns: 1fr 340px;
          gap: 20px;
          align-items: start;
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
        .quickLinks h2 {
          margin: 0;
          font-size: 28px;
          letter-spacing: -.04em;
        }

        .panelHeader a {
          color: white;
          text-decoration: none;
          font-weight: 900;
          border-radius: 16px;
          padding: 12px 16px;
          background: linear-gradient(135deg, #f97316, #fb923c);
        }

        .table {
          display: grid;
          gap: 10px;
        }

        .row {
          display: grid;
          grid-template-columns: 1.5fr 1fr 1fr 1fr 1fr;
          gap: 12px;
          padding: 15px;
          border-radius: 18px;
          background: rgba(255,255,255,.055);
          border: 1px solid rgba(148,163,184,.12);
          align-items: center;
        }

        .row.head {
          color: #94a3b8;
          text-transform: uppercase;
          letter-spacing: .08em;
          font-size: 12px;
          font-weight: 900;
          background: transparent;
          border: 0;
        }

        .row em {
          color: #86efac;
          font-style: normal;
          font-weight: 950;
        }

        .sidePanel {
          display: grid;
          gap: 16px;
        }

        ul {
          margin: 14px 0 0;
          padding-left: 20px;
          color: #cbd5e1;
          line-height: 1.7;
        }

        .quickLinks {
          display: grid;
          gap: 10px;
        }

        .quickLinks a {
          color: white;
          text-decoration: none;
          padding: 14px;
          border-radius: 18px;
          background: rgba(255,255,255,.055);
          border: 1px solid rgba(148,163,184,.12);
          font-weight: 900;
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

        @media (max-width: 720px) {
          .strengthPage {
            padding: 16px;
          }

          .row,
          .row.head {
            grid-template-columns: 1fr;
          }

          .row.head {
            display: none;
          }

          .panelHeader a {
            width: 100%;
            text-align: center;
          }
        }
      `}</style>
    </main>
  );
}
