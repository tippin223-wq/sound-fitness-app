"use client";

import React from "react";

const week = [
  {
    day: "Monday",
    type: "Strength",
    title: "Lower Body Foundation",
    time: "45–55 min",
    focus: "Squat pattern, glutes, hamstrings, bracing",
    status: "Ready",
    href: "/online-program/workouts/detail",
  },
  {
    day: "Tuesday",
    type: "Recovery",
    title: "Mobility + Walk",
    time: "20–30 min",
    focus: "Hips, ankles, light cardio, easy movement",
    status: "Optional",
    href: "/online-program/progress",
  },
  {
    day: "Wednesday",
    type: "Strength",
    title: "Upper Body Foundation",
    time: "45–55 min",
    focus: "Push, pull, shoulders, posture",
    status: "Ready",
    href: "/online-program/workouts/detail",
  },
  {
    day: "Thursday",
    type: "Check-In",
    title: "Progress Review",
    time: "5–10 min",
    focus: "Energy, soreness, pain, sleep, adherence",
    status: "Due",
    href: "/online-program/progress",
  },
  {
    day: "Friday",
    type: "Conditioning",
    title: "Full Body Strength Endurance",
    time: "35–45 min",
    focus: "Carries, core, circuits, controlled pace",
    status: "Locked",
    href: "/online-program/workouts",
  },
  {
    day: "Saturday",
    type: "Recovery",
    title: "Mobility Reset",
    time: "15–25 min",
    focus: "Breathing, hips, t-spine, gentle stretch",
    status: "Optional",
    href: "/online-program/workouts",
  },
  {
    day: "Sunday",
    type: "Plan",
    title: "Preview Next Week",
    time: "5 min",
    focus: "Review wins and prepare for next training week",
    status: "Open",
    href: "/online-program/current-phase",
  },
];

export default function WeeklyPlanPage() {
  return (
    <main className="weeklyPlanPage">
      <section className="hero">
        <div>
          <p className="eyebrow">Online Program</p>
          <h1>Weekly Plan</h1>
          <p>
            Your week-at-a-glance training schedule. Follow the plan, log what
            you complete, and use recovery days to keep momentum.
          </p>
        </div>

        <div className="weekCard">
          <span>Week 2</span>
          <h2>Foundation Strength</h2>
          <p>3 training days • 2 recovery days • 1 check-in</p>
          <div className="progressBar">
            <div />
          </div>
          <small>42% complete this week</small>
        </div>
      </section>

      <section className="layout">
        <section className="planPanel">
          <div className="panelHeader">
            <div>
              <p className="eyebrow">Schedule</p>
              <h2>This Week</h2>
            </div>
            <a href="/online-program/workouts">View Workouts</a>
          </div>

          <div className="dayList">
            {week.map((item) => (
              <a href={item.href} className="dayCard" key={item.day}>
                <div className="dateBlock">
                  <strong>{item.day}</strong>
                  <span>{item.type}</span>
                </div>

                <div className="dayMain">
                  <h3>{item.title}</h3>
                  <p>{item.focus}</p>
                  <small>{item.time}</small>
                </div>

                <span className={`status ${item.status.toLowerCase()}`}>
                  {item.status}
                </span>
              </a>
            ))}
          </div>
        </section>

        <aside className="sidePanel">
          <div className="coachCard">
            <p className="eyebrow">Coach Notes</p>
            <h2>Best Practice</h2>
            <ul>
              <li>Do strength days first when energy is highest.</li>
              <li>Recovery days still count as progress.</li>
              <li>Log honestly so the next plan fits better.</li>
              <li>Do not skip warm-ups during this phase.</li>
            </ul>
          </div>

          <div className="quickLinks">
            <h2>Quick Links</h2>
            <a href="/online-program/current-phase">Current Phase</a>
            <a href="/online-program/workouts">Program Workouts</a>
            <a href="/online-program/progress">Program Progress</a>
            <a href="/online-program/messages">Message Coach</a>
          </div>
        </aside>
      </section>

      <style>{`
        .weeklyPlanPage {
          min-height: 100vh;
          padding: 28px;
          color: #f8fafc;
          background:
            radial-gradient(circle at top left, rgba(37, 99, 235, .25), transparent 34%),
            radial-gradient(circle at top right, rgba(249, 115, 22, .18), transparent 30%),
            #070707;
          font-family: Inter, system-ui, sans-serif;
        }

        .hero {
          display: grid;
          grid-template-columns: 1fr 340px;
          gap: 22px;
          align-items: stretch;
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
          max-width: 780px;
          font-size: 18px;
          line-height: 1.7;
          margin-top: 18px;
        }

        .weekCard,
        .planPanel,
        .coachCard,
        .quickLinks {
          background: rgba(15, 23, 42, .76);
          border: 1px solid rgba(148, 163, 184, .18);
          box-shadow: 0 24px 80px rgba(0,0,0,.35);
          border-radius: 28px;
          backdrop-filter: blur(18px);
        }

        .weekCard {
          padding: 24px;
        }

        .weekCard span {
          color: #93c5fd;
          font-weight: 900;
        }

        .weekCard h2 {
          margin: 10px 0;
          font-size: 30px;
          letter-spacing: -.04em;
        }

        .weekCard p {
          font-size: 15px;
          margin: 0 0 18px;
        }

        .progressBar {
          height: 12px;
          border-radius: 999px;
          background: rgba(255,255,255,.08);
          overflow: hidden;
        }

        .progressBar div {
          height: 100%;
          width: 42%;
          background: linear-gradient(90deg, #2563eb, #38bdf8, #f97316);
        }

        .weekCard small {
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

        .planPanel,
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
          text-decoration: none;
          color: white;
          background: linear-gradient(135deg, #f97316, #fb923c);
          padding: 12px 16px;
          border-radius: 16px;
          font-weight: 900;
        }

        .dayList {
          display: grid;
          gap: 12px;
        }

        .dayCard {
          display: grid;
          grid-template-columns: 110px 1fr auto;
          gap: 16px;
          align-items: center;
          text-decoration: none;
          color: white;
          background: rgba(255,255,255,.055);
          border: 1px solid rgba(148,163,184,.14);
          border-radius: 22px;
          padding: 16px;
        }

        .dayCard:hover {
          border-color: rgba(96,165,250,.45);
          background: rgba(255,255,255,.085);
        }

        .dateBlock {
          display: grid;
          gap: 5px;
          background: rgba(37,99,235,.16);
          color: #bfdbfe;
          border-radius: 16px;
          padding: 12px;
        }

        .dateBlock strong {
          color: #fff;
        }

        .dateBlock span {
          font-size: 13px;
        }

        .dayMain h3 {
          margin: 0 0 6px;
        }

        .dayMain p {
          color: #cbd5e1;
          margin: 0 0 6px;
          line-height: 1.5;
        }

        .dayMain small {
          color: #94a3b8;
        }

        .status {
          font-size: 12px;
          font-weight: 900;
          border-radius: 999px;
          padding: 7px 10px;
          background: rgba(148,163,184,.14);
          color: #cbd5e1;
        }

        .status.ready,
        .status.open {
          background: rgba(34,197,94,.15);
          color: #86efac;
        }

        .status.due {
          background: rgba(249,115,22,.16);
          color: #fdba74;
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
          font-weight: 800;
        }

        .quickLinks a:hover {
          border-color: rgba(249,115,22,.45);
        }

        @media (max-width: 1000px) {
          .hero,
          .layout {
            grid-template-columns: 1fr;
          }

          .dayCard {
            grid-template-columns: 1fr;
          }

          .panelHeader {
            align-items: flex-start;
            flex-direction: column;
          }
        }

        @media (max-width: 640px) {
          .weeklyPlanPage {
            padding: 16px;
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
