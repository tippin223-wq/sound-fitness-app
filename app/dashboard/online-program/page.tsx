"use client";

import React from "react";

const weeklyWorkouts = [
  {
    day: "Monday",
    title: "Lower Body Strength",
    focus: "Squat pattern, glutes, hamstrings, core brace",
    status: "Ready",
    href: "/dashboard/online-program/workouts/detail",
  },
  {
    day: "Wednesday",
    title: "Upper Body Strength",
    focus: "Push, pull, shoulders, posture",
    status: "Ready",
    href: "/dashboard/online-program/workouts/detail",
  },
  {
    day: "Friday",
    title: "Full Body Conditioning",
    focus: "Strength endurance, carries, core, finishers",
    status: "Locked",
    href: "/dashboard/online-program/workouts",
  },
];

const progressStats = [
  {
    label: "Program Completion",
    value: "42%",
    note: "5 of 12 workouts complete",
  },
  { label: "Current Streak", value: "3", note: "Training weeks in a row" },
  {
    label: "Strength Trend",
    value: "+8%",
    note: "Estimated improvement this phase",
  },
];

export default function OnlineProgramPage() {
  return (
    <main className="onlineProgramPage">
      <section className="hero">
        <div>
          <p className="eyebrow">Sound Fitness Online Coaching</p>
          <h1>Online Program Dashboard</h1>
          <p className="heroText">
            Your current training phase, weekly plan, workouts, progress, and
            coach guidance in one clean place.
          </p>

          <div className="heroActions">
            <a href="/dashboard/online-program/weekly-plan">View Weekly Plan</a>
            <a href="/dashboard/online-program/workouts">Start Workout</a>
          </div>
        </div>

        <div className="phaseCard">
          <p className="cardLabel">Current Phase</p>
          <h2>Foundation Strength</h2>
          <p>
            Build clean movement, improve consistency, and establish strength
            baselines before progressing intensity.
          </p>

          <div className="phaseProgress">
            <div style={{ width: "42%" }} />
          </div>

          <small>Week 2 of 6</small>
        </div>
      </section>

      <section className="statsGrid">
        {progressStats.map((stat) => (
          <div className="statCard" key={stat.label}>
            <span>{stat.value}</span>
            <h3>{stat.label}</h3>
            <p>{stat.note}</p>
          </div>
        ))}
      </section>

      <section className="contentGrid">
        <div className="mainPanel">
          <div className="panelHeader">
            <div>
              <p className="eyebrow">This Week</p>
              <h2>Weekly Plan</h2>
            </div>
            <a href="/dashboard/online-program/weekly-plan">Open Full Plan</a>
          </div>

          <div className="workoutList">
            {weeklyWorkouts.map((workout) => (
              <a className="workoutCard" href={workout.href} key={workout.day}>
                <div className="dayBadge">{workout.day}</div>
                <div>
                  <h3>{workout.title}</h3>
                  <p>{workout.focus}</p>
                </div>
                <span
                  className={workout.status === "Ready" ? "ready" : "locked"}
                >
                  {workout.status}
                </span>
              </a>
            ))}
          </div>
        </div>

        <aside className="sidePanel">
          <div className="coachBox">
            <p className="eyebrow">Coach Note</p>
            <h2>This week’s priority</h2>
            <p>
              Focus on clean reps, controlled tempo, and logging honestly. Do
              not chase heavy weight before your form is consistent.
            </p>
            <a href="/dashboard/online-program/messages">Message Coach</a>
          </div>

          <div className="navBox">
            <h2>Program Pages</h2>

            <a href="/dashboard/online-program/current-phase">
              <strong>Current Phase</strong>
              <span>Training block overview</span>
            </a>

            <a href="/dashboard/online-program/weekly-plan">
              <strong>Weekly Plan</strong>
              <span>Schedule and priorities</span>
            </a>

            <a href="/dashboard/online-program/workouts">
              <strong>Program Workouts</strong>
              <span>Workout list and details</span>
            </a>

            <a href="/dashboard/online-program/progress">
              <strong>Program Progress</strong>
              <span>Strength, completion, streak</span>
            </a>

            <a href="/dashboard/online-program/messages">
              <strong>Program Messaging</strong>
              <span>Coach support</span>
            </a>
          </div>
        </aside>
      </section>

      <style>{`
        .onlineProgramPage {
          min-height: 100vh;
          padding: 28px;
          color: #f8fafc;
          background:
            radial-gradient(circle at top left, rgba(37, 99, 235, .24), transparent 34%),
            radial-gradient(circle at top right, rgba(249, 115, 22, .18), transparent 30%),
            #070707;
          font-family: Inter, system-ui, sans-serif;
        }

        .hero {
          display: grid;
          grid-template-columns: 1fr 360px;
          gap: 24px;
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
          font-size: clamp(42px, 7vw, 82px);
          line-height: .9;
          letter-spacing: -.07em;
          margin: 0;
        }

        .heroText {
          max-width: 760px;
          color: #cbd5e1;
          font-size: 18px;
          line-height: 1.7;
          margin: 18px 0 0;
        }

        .heroActions {
          display: flex;
          gap: 12px;
          margin-top: 24px;
          flex-wrap: wrap;
        }

        .heroActions a,
        .panelHeader a,
        .coachBox a {
          color: white;
          text-decoration: none;
          font-weight: 900;
          border-radius: 16px;
          padding: 13px 17px;
          background: linear-gradient(135deg, #2563eb, #0ea5e9);
        }

        .heroActions a:last-child {
          background: linear-gradient(135deg, #f97316, #fb923c);
        }

        .phaseCard,
        .statCard,
        .mainPanel,
        .sidePanel > div {
          background: rgba(15, 23, 42, .76);
          border: 1px solid rgba(148, 163, 184, .18);
          box-shadow: 0 24px 80px rgba(0,0,0,.35);
          border-radius: 28px;
          backdrop-filter: blur(18px);
        }

        .phaseCard {
          padding: 26px;
        }

        .cardLabel {
          color: #93c5fd;
          font-weight: 900;
          margin: 0 0 10px;
        }

        .phaseCard h2 {
          font-size: 30px;
          margin: 0 0 12px;
        }

        .phaseCard p {
          color: #cbd5e1;
          line-height: 1.6;
        }

        .phaseProgress {
          height: 12px;
          background: rgba(255,255,255,.08);
          border-radius: 999px;
          overflow: hidden;
          margin-top: 20px;
        }

        .phaseProgress div {
          height: 100%;
          background: linear-gradient(90deg, #2563eb, #38bdf8, #f97316);
        }

        .phaseCard small {
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

        .statCard {
          padding: 22px;
        }

        .statCard span {
          font-size: 44px;
          font-weight: 950;
          letter-spacing: -.06em;
        }

        .statCard h3 {
          margin: 6px 0;
        }

        .statCard p {
          color: #cbd5e1;
          margin: 0;
        }

        .contentGrid {
          display: grid;
          grid-template-columns: 1fr 360px;
          gap: 20px;
          align-items: start;
        }

        .mainPanel,
        .coachBox,
        .navBox {
          padding: 24px;
        }

        .panelHeader {
          display: flex;
          justify-content: space-between;
          gap: 18px;
          align-items: center;
          margin-bottom: 18px;
        }

        .panelHeader h2,
        .coachBox h2,
        .navBox h2 {
          margin: 0;
          font-size: 28px;
          letter-spacing: -.04em;
        }

        .workoutList {
          display: grid;
          gap: 12px;
        }

        .workoutCard {
          display: grid;
          grid-template-columns: 110px 1fr auto;
          gap: 16px;
          align-items: center;
          text-decoration: none;
          color: white;
          background: rgba(255,255,255,.055);
          border: 1px solid rgba(148, 163, 184, .14);
          border-radius: 22px;
          padding: 16px;
        }

        .workoutCard:hover {
          border-color: rgba(96, 165, 250, .45);
          background: rgba(255,255,255,.085);
        }

        .dayBadge {
          background: rgba(37, 99, 235, .16);
          color: #bfdbfe;
          border-radius: 16px;
          padding: 12px;
          text-align: center;
          font-weight: 900;
        }

        .workoutCard h3 {
          margin: 0 0 6px;
        }

        .workoutCard p {
          margin: 0;
          color: #cbd5e1;
        }

        .ready,
        .locked {
          font-size: 12px;
          font-weight: 900;
          border-radius: 999px;
          padding: 7px 10px;
        }

        .ready {
          background: rgba(34,197,94,.15);
          color: #86efac;
        }

        .locked {
          background: rgba(148,163,184,.14);
          color: #cbd5e1;
        }

        .sidePanel {
          display: grid;
          gap: 16px;
        }

        .coachBox p {
          color: #cbd5e1;
          line-height: 1.6;
        }

        .coachBox a {
          display: inline-block;
          margin-top: 8px;
          background: linear-gradient(135deg, #f97316, #fb923c);
        }

        .navBox {
          display: grid;
          gap: 10px;
        }

        .navBox a {
          display: grid;
          gap: 4px;
          text-decoration: none;
          color: white;
          padding: 14px;
          border-radius: 18px;
          background: rgba(255,255,255,.055);
          border: 1px solid rgba(148,163,184,.12);
        }

        .navBox a:hover {
          border-color: rgba(249, 115, 22, .45);
        }

        .navBox span {
          color: #94a3b8;
          font-size: 14px;
        }

        @media (max-width: 1000px) {
          .hero,
          .statsGrid,
          .contentGrid {
            grid-template-columns: 1fr;
          }

          .workoutCard {
            grid-template-columns: 1fr;
          }

          .panelHeader {
            align-items: flex-start;
            flex-direction: column;
          }
        }

        @media (max-width: 640px) {
          .onlineProgramPage {
            padding: 16px;
          }

          .heroActions {
            flex-direction: column;
          }

          .heroActions a,
          .panelHeader a,
          .coachBox a {
            text-align: center;
          }
        }
      `}</style>
    </main>
  );
}
