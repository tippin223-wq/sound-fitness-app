"use client";

import React from "react";

const streakDays = [
  { day: "Mon", done: true },
  { day: "Tue", done: true },
  { day: "Wed", done: true },
  { day: "Thu", done: false },
  { day: "Fri", done: false },
  { day: "Sat", done: false },
  { day: "Sun", done: false },
];

export default function StreakPage() {
  const completed = streakDays.filter((day) => day.done).length;

  return (
    <main className="streakPage">
      <section className="hero">
        <div>
          <p className="eyebrow">Program Progress</p>
          <h1>Streak</h1>
          <p>
            Track consistency across the week. The goal is momentum, not
            perfection.
          </p>
        </div>

        <div className="scoreCard">
          <span>{completed}</span>
          <h2>Days Active</h2>
          <p>This week</p>
        </div>
      </section>

      <section className="layout">
        <section className="mainPanel">
          <div className="panelHeader">
            <div>
              <p className="eyebrow">Weekly Consistency</p>
              <h2>Activity Streak</h2>
            </div>
            <a href="/dashboard/online-program/progress">Back to Progress</a>
          </div>

          <div className="streakGrid">
            {streakDays.map((item) => (
              <div className={item.done ? "day done" : "day"} key={item.day}>
                <strong>{item.day}</strong>
                <span>{item.done ? "✓" : "—"}</span>
              </div>
            ))}
          </div>

          <div className="messageBox">
            <h2>Keep the chain alive</h2>
            <p>
              Recovery, mobility, check-ins, and workouts all count. Small wins
              keep the program moving.
            </p>
          </div>
        </section>

        <aside className="sidePanel">
          <div className="coachCard">
            <p className="eyebrow">Coach Insight</p>
            <h2>Best Practice</h2>
            <ul>
              <li>Do not punish missed days.</li>
              <li>Use streaks to build confidence.</li>
              <li>Let recovery days count.</li>
              <li>Make the next action obvious.</li>
            </ul>
          </div>

          <div className="quickLinks">
            <h2>Next Steps</h2>
            <a href="/dashboard/online-program/weekly-plan">Weekly Plan</a>
            <a href="/dashboard/online-program/workouts">Continue Workouts</a>
            <a href="/dashboard/online-program/progress/completion">Completion %</a>
          </div>
        </aside>
      </section>

      <style>{`
        .streakPage {
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
          font-size: 18px;
          line-height: 1.7;
          margin-top: 18px;
          max-width: 720px;
        }

        .scoreCard,
        .mainPanel,
        .coachCard,
        .quickLinks,
        .messageBox {
          background: rgba(15,23,42,.76);
          border: 1px solid rgba(148,163,184,.18);
          box-shadow: 0 24px 80px rgba(0,0,0,.35);
          border-radius: 28px;
          backdrop-filter: blur(18px);
          padding: 24px;
        }

        .scoreCard span {
          font-size: 68px;
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
          align-items: center;
          gap: 16px;
          margin-bottom: 20px;
        }

        .panelHeader h2,
        .coachCard h2,
        .quickLinks h2,
        .messageBox h2 {
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

        .streakGrid {
          display: grid;
          grid-template-columns: repeat(7, 1fr);
          gap: 12px;
        }

        .day {
          min-height: 120px;
          border-radius: 22px;
          background: rgba(255,255,255,.055);
          border: 1px solid rgba(148,163,184,.12);
          display: grid;
          place-items: center;
          text-align: center;
          padding: 14px;
        }

        .day strong {
          color: #cbd5e1;
        }

        .day span {
          font-size: 34px;
          font-weight: 950;
          color: #64748b;
        }

        .day.done {
          border-color: rgba(34,197,94,.35);
          background: rgba(34,197,94,.14);
        }

        .day.done span {
          color: #86efac;
        }

        .messageBox {
          margin-top: 18px;
          box-shadow: none;
        }

        .messageBox p,
        .coachCard li {
          color: #cbd5e1;
          line-height: 1.7;
        }

        .sidePanel {
          display: grid;
          gap: 16px;
        }

        ul {
          margin: 14px 0 0;
          padding-left: 20px;
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
          .layout {
            grid-template-columns: 1fr;
          }

          .streakGrid {
            grid-template-columns: repeat(4, 1fr);
          }

          .panelHeader {
            align-items: flex-start;
            flex-direction: column;
          }
        }

        @media (max-width: 640px) {
          .streakPage {
            padding: 16px;
          }

          .streakGrid {
            grid-template-columns: repeat(2, 1fr);
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
