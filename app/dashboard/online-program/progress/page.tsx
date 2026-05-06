"use client";

import React from "react";

const strengthStats = [
  { lift: "Goblet Squat", start: "35 lb", current: "45 lb", change: "+10 lb" },
  { lift: "RDL", start: "50 lb", current: "65 lb", change: "+15 lb" },
  {
    lift: "Push-Up",
    start: "Incline",
    current: "Lower Incline",
    change: "Harder",
  },
];

export default function ProgramProgressPage() {
  return (
    <main className="progressPage">
      <section className="hero">
        <div>
          <p className="eyebrow">Online Program</p>
          <h1>Program Progress</h1>
          <p>
            Track strength, workout completion, streaks, and consistency so
            progress stays visible.
          </p>
        </div>

        <div className="scoreCard">
          <span>42%</span>
          <h2>Program Complete</h2>
          <div className="bar">
            <div />
          </div>
          <small>5 of 12 workouts completed</small>
        </div>
      </section>

      <section className="statsGrid">
        <a href="/dashboard/online-program/progress/strength">
          <span>+8%</span>
          <strong>Strength Trend</strong>
          <p>Estimated improvement this phase</p>
        </a>

        <a href="/dashboard/online-program/progress/completion">
          <span>5/12</span>
          <strong>Completion</strong>
          <p>Completed workouts this block</p>
        </a>

        <a href="/dashboard/online-program/progress/streak">
          <span>3</span>
          <strong>Week Streak</strong>
          <p>Consistency weeks in a row</p>
        </a>
      </section>

      <section className="layout">
        <section className="mainPanel">
          <div className="panelHeader">
            <div>
              <p className="eyebrow">Strength Tracking</p>
              <h2>Key Movement Progress</h2>
            </div>
            <a href="/dashboard/online-program/progress/strength">Open Strength Page</a>
          </div>

          <div className="table">
            <div className="row head">
              <span>Movement</span>
              <span>Start</span>
              <span>Current</span>
              <span>Change</span>
            </div>

            {strengthStats.map((item) => (
              <div className="row" key={item.lift}>
                <span>{item.lift}</span>
                <span>{item.start}</span>
                <span>{item.current}</span>
                <strong>{item.change}</strong>
              </div>
            ))}
          </div>
        </section>

        <aside className="sidePanel">
          <div className="coachCard">
            <p className="eyebrow">Coach Insight</p>
            <h2>What progress means</h2>
            <p>
              Progress is not just heavier weight. Better form, less pain, more
              consistency, and faster recovery all count.
            </p>
          </div>

          <div className="quickLinks">
            <h2>Progress Pages</h2>
            <a href="/dashboard/online-program/progress/strength">Strength Tracking</a>
            <a href="/dashboard/online-program/progress/completion">Completion %</a>
            <a href="/dashboard/online-program/progress/streak">Streak</a>
            <a href="/dashboard/online-program/weekly-plan">Weekly Plan</a>
          </div>
        </aside>
      </section>

      <style>{`
        .progressPage {
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
        .statsGrid a,
        .mainPanel,
        .coachCard,
        .quickLinks {
          background: rgba(15,23,42,.76);
          border: 1px solid rgba(148,163,184,.18);
          box-shadow: 0 24px 80px rgba(0,0,0,.35);
          border-radius: 28px;
          backdrop-filter: blur(18px);
        }

        .scoreCard {
          padding: 24px;
        }

        .scoreCard span {
          font-size: 62px;
          font-weight: 950;
          letter-spacing: -.07em;
        }

        .scoreCard h2 {
          margin: 4px 0 14px;
        }

        .bar {
          height: 12px;
          border-radius: 999px;
          background: rgba(255,255,255,.08);
          overflow: hidden;
        }

        .bar div {
          height: 100%;
          width: 42%;
          background: linear-gradient(90deg, #2563eb, #38bdf8, #f97316);
        }

        .scoreCard small {
          color: #94a3b8;
          display: block;
          margin-top: 12px;
        }

        .statsGrid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 16px;
          margin-bottom: 22px;
        }

        .statsGrid a {
          padding: 22px;
          color: white;
          text-decoration: none;
        }

        .statsGrid a:hover {
          border-color: rgba(249,115,22,.45);
          transform: translateY(-2px);
        }

        .statsGrid span {
          display: block;
          font-size: 42px;
          font-weight: 950;
          letter-spacing: -.06em;
          margin-bottom: 8px;
        }

        .statsGrid strong {
          display: block;
          font-size: 19px;
        }

        .statsGrid p {
          color: #94a3b8;
          margin: 8px 0 0;
          line-height: 1.5;
        }

        .layout {
          display: grid;
          grid-template-columns: 1fr 340px;
          gap: 20px;
          align-items: start;
        }

        .mainPanel,
        .coachCard,
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
          grid-template-columns: 1.5fr 1fr 1fr 1fr;
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

        .row strong {
          color: #86efac;
        }

        .sidePanel {
          display: grid;
          gap: 16px;
        }

        .coachCard p {
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

        .quickLinks a:hover {
          border-color: rgba(249,115,22,.45);
        }

        @media (max-width: 1000px) {
          .hero,
          .layout,
          .statsGrid {
            grid-template-columns: 1fr;
          }

          .panelHeader {
            align-items: flex-start;
            flex-direction: column;
          }
        }

        @media (max-width: 700px) {
          .progressPage {
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
