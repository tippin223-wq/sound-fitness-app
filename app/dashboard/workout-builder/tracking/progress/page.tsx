"use client";

import React from "react";

const logs = [
  { date: "Today", workout: "Lower Body Strength", effort: 8 },
  { date: "Wed", workout: "Upper Body Foundation", effort: 7 },
  { date: "Mon", workout: "Full Body Conditioning", effort: 9 },
  { date: "Last Fri", workout: "Lower Body Strength", effort: 8 },
];

export default function TrackingProgressPage() {
  const avgEffort =
    Math.round(
      (logs.reduce((sum, log) => sum + log.effort, 0) / logs.length) * 10,
    ) / 10;

  return (
    <main className="progressPage">
      <section className="hero">
        <div>
          <p className="eyebrow">Optional Tracking</p>
          <h1>Basic Progress</h1>
          <p>
            Review consistency, effort trends, and recent activity to guide
            better programming decisions.
          </p>
        </div>

        <div className="summaryCard">
          <span>{avgEffort}</span>
          <h2>Avg Effort</h2>
          <p>Last {logs.length} sessions</p>
        </div>
      </section>

      <section className="layout">
        <section className="mainPanel">
          <div className="panelHeader">
            <div>
              <p className="eyebrow">Recent Logs</p>
              <h2>Workout History</h2>
            </div>
            <a href="/dashboard/workout-builder/tracking/log">Log Workout</a>
          </div>

          <div className="tableHeader">
            <span>Date</span>
            <span>Workout</span>
            <span>Effort</span>
          </div>

          <div className="rows">
            {logs.map((log, index) => (
              <div className="row" key={index}>
                <span>{log.date}</span>
                <strong>{log.workout}</strong>
                <span>{log.effort}/10</span>
              </div>
            ))}
          </div>

          <div className="trendBox">
            <h2>Trend Insight</h2>
            <p>
              Effort is staying consistent. If sessions start dropping below
              target effort, consider reducing load or improving recovery
              inputs.
            </p>
          </div>
        </section>

        <aside className="sidePanel">
          <div className="coachCard">
            <p className="eyebrow">Best Practice</p>
            <h2>Use trends, not single days</h2>
            <ul>
              <li>One hard or easy day doesn’t matter.</li>
              <li>Look at 3–5 session trends.</li>
              <li>Effort guides progression.</li>
              <li>Combine effort with pain + notes.</li>
            </ul>
          </div>

          <div className="quickLinks">
            <h2>Quick Links</h2>
            <a href="/dashboard/workout-builder/tracking">Tracking Home</a>
            <a href="/dashboard/workout-builder/tracking/log">Log Workout</a>
            <a href="/dashboard/workout-builder/saved">Saved Workouts</a>
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
        .mainPanel,
        .coachCard,
        .quickLinks,
        .trendBox {
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
        }

        .layout {
          display: grid;
          grid-template-columns: 1fr 340px;
          gap: 20px;
        }

        .panelHeader {
          display: flex;
          justify-content: space-between;
          margin-bottom: 18px;
        }

        .tableHeader,
        .row {
          display: grid;
          grid-template-columns: 1fr 2fr 1fr;
          gap: 10px;
          align-items: center;
        }

        .tableHeader {
          font-size: 12px;
          color: #94a3b8;
          margin-bottom: 10px;
        }

        .row {
          background: rgba(255,255,255,.05);
          padding: 12px;
          border-radius: 14px;
          margin-bottom: 8px;
        }

        .trendBox {
          margin-top: 16px;
        }

        .actions a,
        .panelHeader a,
        .quickLinks a {
          color: white;
          text-decoration: none;
          padding: 10px 14px;
          border-radius: 12px;
          font-weight: 900;
          background: linear-gradient(135deg,#2563eb,#f97316);
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
          background: rgba(255,255,255,.05);
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
