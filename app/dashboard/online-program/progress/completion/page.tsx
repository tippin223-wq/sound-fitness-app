"use client";

import React from "react";

const workouts = [
  { name: "Lower Body Foundation", status: "Completed" },
  { name: "Upper Body Foundation", status: "Completed" },
  { name: "Full Body Conditioning", status: "In Progress" },
  { name: "Lower Body Progression", status: "Locked" },
  { name: "Upper Body Progression", status: "Locked" },
  { name: "Full Body Conditioning 2", status: "Locked" },
];

export default function CompletionPage() {
  const completed = workouts.filter((w) => w.status === "Completed").length;
  const percent = Math.round((completed / workouts.length) * 100);

  return (
    <main className="completionPage">
      <section className="hero">
        <div>
          <p className="eyebrow">Program Progress</p>
          <h1>Completion</h1>
          <p>
            Track how much of the program you’ve completed. Consistency drives
            results.
          </p>
        </div>

        <div className="scoreCard">
          <span>{percent}%</span>
          <h2>Completed</h2>
          <div className="bar">
            <div style={{ width: `${percent}%` }} />
          </div>
          <small>
            {completed} of {workouts.length} workouts finished
          </small>
        </div>
      </section>

      <section className="layout">
        <section className="mainPanel">
          <div className="panelHeader">
            <div>
              <p className="eyebrow">Workout Completion</p>
              <h2>All Workouts</h2>
            </div>
            <a href="/online-program/progress">Back to Progress</a>
          </div>

          <div className="list">
            {workouts.map((w) => (
              <div className="item" key={w.name}>
                <strong>{w.name}</strong>
                <span
                  className={`status ${w.status.replace(" ", "-").toLowerCase()}`}
                >
                  {w.status}
                </span>
              </div>
            ))}
          </div>
        </section>

        <aside className="sidePanel">
          <div className="coachCard">
            <p className="eyebrow">Coach Insight</p>
            <h2>Completion matters</h2>
            <p>
              Finishing workouts consistently matters more than doing them
              perfectly. Progress compounds when you show up.
            </p>
          </div>

          <div className="quickLinks">
            <h2>Next Steps</h2>
            <a href="/online-program/workouts">Continue Workouts</a>
            <a href="/online-program/progress/streak">View Streak</a>
            <a href="/online-program/weekly-plan">Weekly Plan</a>
          </div>
        </aside>
      </section>

      <style>{`
        .completionPage {
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
          letter-spacing: -.06em;
        }

        .hero p {
          color: #cbd5e1;
          max-width: 700px;
        }

        .scoreCard,
        .mainPanel,
        .coachCard,
        .quickLinks {
          background: rgba(15,23,42,.76);
          border-radius: 24px;
          padding: 22px;
        }

        .scoreCard span {
          font-size: 60px;
          font-weight: 900;
        }

        .bar {
          height: 10px;
          background: rgba(255,255,255,.1);
          border-radius: 999px;
          overflow: hidden;
          margin-top: 10px;
        }

        .bar div {
          height: 100%;
          background: linear-gradient(90deg,#2563eb,#f97316);
        }

        .layout {
          display: grid;
          grid-template-columns: 1fr 320px;
          gap: 20px;
        }

        .panelHeader {
          display: flex;
          justify-content: space-between;
          margin-bottom: 18px;
        }

        .list {
          display: grid;
          gap: 10px;
        }

        .item {
          display: flex;
          justify-content: space-between;
          padding: 14px;
          border-radius: 14px;
          background: rgba(255,255,255,.05);
        }

        .status {
          padding: 6px 10px;
          border-radius: 999px;
          font-size: 12px;
          font-weight: 700;
        }

        .status.completed {
          background: rgba(34,197,94,.2);
          color: #86efac;
        }

        .status.in-progress {
          background: rgba(59,130,246,.2);
          color: #93c5fd;
        }

        .status.locked {
          background: rgba(148,163,184,.2);
          color: #cbd5e1;
        }

        .sidePanel {
          display: grid;
          gap: 16px;
        }

        .quickLinks a {
          display: block;
          padding: 12px;
          border-radius: 12px;
          margin-top: 8px;
          background: rgba(255,255,255,.05);
          text-decoration: none;
          color: white;
        }

        @media (max-width: 900px) {
          .hero,
          .layout {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </main>
  );
}
