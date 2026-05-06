"use client";

import React from "react";

const trackingCards = [
  {
    title: "Log Workout",
    desc: "Quickly record a completed workout, notes, effort, and basic results.",
    href: "/dashboard/workout-builder/tracking/log",
    status: "Fast Entry",
  },
  {
    title: "Basic Progress",
    desc: "Review consistency, recent workouts, and simple performance trends.",
    href: "/dashboard/workout-builder/tracking/progress",
    status: "Review",
  },
];

const recentLogs = [
  {
    workout: "Lower Body Strength",
    date: "Today",
    effort: "8/10",
    note: "Good control",
  },
  {
    workout: "Upper Body Foundation",
    date: "Wed",
    effort: "7/10",
    note: "Shoulders felt good",
  },
  {
    workout: "Full Body Conditioning",
    date: "Mon",
    effort: "9/10",
    note: "Tough finish",
  },
];

export default function BuilderTrackingPage() {
  return (
    <main className="trackingPage">
      <section className="hero">
        <div>
          <p className="eyebrow">Workout Builder</p>
          <h1>Optional Tracking</h1>
          <p>
            Simple workout logging for coach-built workouts. Use this when you
            want lightweight tracking without turning the builder into a full
            client dashboard.
          </p>
        </div>

        <div className="summaryCard">
          <span>3</span>
          <h2>Recent Logs</h2>
          <p>Basic progress tracking</p>
        </div>
      </section>

      <section className="cardGrid">
        {trackingCards.map((card) => (
          <a className="trackCard" href={card.href} key={card.title}>
            <div className="topLine">
              <span>{card.status}</span>
              <strong>→</strong>
            </div>
            <h2>{card.title}</h2>
            <p>{card.desc}</p>
          </a>
        ))}
      </section>

      <section className="layout">
        <section className="mainPanel">
          <div className="panelHeader">
            <div>
              <p className="eyebrow">Recent Activity</p>
              <h2>Workout Logs</h2>
            </div>
            <a href="/dashboard/workout-builder/tracking/log">Log Workout</a>
          </div>

          <div className="logList">
            {recentLogs.map((log) => (
              <div className="logRow" key={log.workout}>
                <strong>{log.workout}</strong>
                <span>{log.date}</span>
                <span>{log.effort}</span>
                <p>{log.note}</p>
              </div>
            ))}
          </div>
        </section>

        <aside className="sidePanel">
          <div className="coachCard">
            <p className="eyebrow">Best Practice</p>
            <h2>Keep it optional</h2>
            <p>
              This section should support coaching decisions without becoming
              busywork. Track what helps you make better programming choices.
            </p>
          </div>

          <div className="quickLinks">
            <h2>Quick Links</h2>
            <a href="/dashboard/workout-builder">Builder Home</a>
            <a href="/dashboard/workout-builder/saved">Saved Workouts</a>
            <a href="/dashboard/workout-builder/tracking/log">Log Workout</a>
            <a href="/dashboard/workout-builder/tracking/progress">Basic Progress</a>
          </div>
        </aside>
      </section>

      <style>{`
        .trackingPage {
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
        .trackCard,
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

        .summaryCard span {
          font-size: 68px;
          font-weight: 950;
          letter-spacing: -.07em;
        }

        .summaryCard h2 {
          margin: 4px 0 8px;
        }

        .summaryCard p,
        .trackCard p,
        .coachCard p,
        .logRow p {
          color: #cbd5e1;
          line-height: 1.6;
        }

        .cardGrid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 16px;
          margin-bottom: 22px;
        }

        .trackCard {
          color: white;
          text-decoration: none;
        }

        .trackCard:hover {
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
        .quickLinks h2,
        .trackCard h2 {
          margin: 0 0 10px;
          font-size: 28px;
          letter-spacing: -.04em;
        }

        .panelHeader a,
        .quickLinks a {
          color: white;
          text-decoration: none;
          font-weight: 900;
          border-radius: 16px;
          padding: 12px 16px;
          background: linear-gradient(135deg, #f97316, #fb923c);
        }

        .logList {
          display: grid;
          gap: 10px;
        }

        .logRow {
          display: grid;
          grid-template-columns: 1.3fr .7fr .7fr 1.2fr;
          gap: 12px;
          align-items: center;
          background: rgba(255,255,255,.055);
          border: 1px solid rgba(148,163,184,.12);
          border-radius: 18px;
          padding: 14px;
        }

        .logRow span {
          color: #bfdbfe;
          font-weight: 800;
        }

        .logRow p {
          margin: 0;
        }

        .sidePanel {
          display: grid;
          gap: 16px;
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
          .layout,
          .cardGrid {
            grid-template-columns: 1fr;
          }

          .panelHeader {
            align-items: flex-start;
            flex-direction: column;
          }
        }

        @media (max-width: 700px) {
          .trackingPage {
            padding: 16px;
          }

          .logRow {
            grid-template-columns: 1fr;
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
