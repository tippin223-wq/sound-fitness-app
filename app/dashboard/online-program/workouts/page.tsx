"use client";

import React from "react";

const workouts = [
  {
    title: "Lower Body Foundation",
    focus: "Squat, glutes, hamstrings, core brace",
    duration: "45–55 min",
    status: "Completed",
    day: "Day 1",
    href: "/dashboard/online-program/workouts/detail",
  },
  {
    title: "Upper Body Foundation",
    focus: "Push, pull, shoulders, posture",
    duration: "45–55 min",
    status: "Ready",
    day: "Day 2",
    href: "/dashboard/online-program/workouts/detail",
  },
  {
    title: "Full Body Conditioning",
    focus: "Circuits, carries, core, endurance",
    duration: "35–45 min",
    status: "Locked",
    day: "Day 3",
    href: "/dashboard/online-program/workouts",
  },
];

export default function ProgramWorkoutsPage() {
  return (
    <main className="workoutsPage">
      <section className="hero">
        <div>
          <p className="eyebrow">Online Program</p>
          <h1>Program Workouts</h1>
          <p>
            These are your assigned workouts for this phase. Start where you
            left off and track your progress as you go.
          </p>
        </div>

        <div className="summaryCard">
          <h2>Progress</h2>
          <p>1 of 3 workouts completed</p>
          <div className="progressBar">
            <div />
          </div>
          <small>33% complete</small>
        </div>
      </section>

      <section className="workoutGrid">
        {workouts.map((workout) => (
          <a href={workout.href} className="workoutCard" key={workout.title}>
            <div className="topRow">
              <span className="day">{workout.day}</span>
              <span className={`status ${workout.status.toLowerCase()}`}>
                {workout.status}
              </span>
            </div>

            <h2>{workout.title}</h2>
            <p>{workout.focus}</p>

            <div className="bottomRow">
              <span>{workout.duration}</span>
              <strong>Start →</strong>
            </div>
          </a>
        ))}
      </section>

      <section className="navLinks">
        <a href="/dashboard/online-program/weekly-plan">← Weekly Plan</a>
        <a href="/dashboard/online-program/current-phase">Current Phase</a>
        <a href="/dashboard/online-program/progress">Progress →</a>
      </section>

      <style>{`
        .workoutsPage {
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
          gap: 20px;
          margin-bottom: 24px;
        }

        .eyebrow {
          color: #60a5fa;
          text-transform: uppercase;
          letter-spacing: .16em;
          font-size: 12px;
          font-weight: 900;
        }

        h1 {
          font-size: clamp(44px, 8vw, 80px);
          margin: 10px 0;
          letter-spacing: -.06em;
        }

        .hero p {
          color: #cbd5e1;
          max-width: 700px;
          line-height: 1.6;
        }

        .summaryCard,
        .workoutCard {
          background: rgba(15,23,42,.76);
          border: 1px solid rgba(148,163,184,.18);
          border-radius: 24px;
          padding: 20px;
        }

        .progressBar {
          height: 10px;
          background: rgba(255,255,255,.08);
          border-radius: 999px;
          overflow: hidden;
          margin-top: 10px;
        }

        .progressBar div {
          height: 100%;
          width: 33%;
          background: linear-gradient(90deg,#2563eb,#38bdf8,#f97316);
        }

        .workoutGrid {
          display: grid;
          gap: 16px;
        }

        .workoutCard {
          text-decoration: none;
          color: white;
          transition: .2s;
        }

        .workoutCard:hover {
          transform: translateY(-4px);
          border-color: #60a5fa;
        }

        .topRow {
          display: flex;
          justify-content: space-between;
          margin-bottom: 10px;
        }

        .day {
          background: rgba(37,99,235,.2);
          padding: 6px 10px;
          border-radius: 12px;
        }

        .status {
          font-size: 12px;
          font-weight: 800;
          padding: 6px 10px;
          border-radius: 999px;
        }

        .status.completed {
          background: rgba(34,197,94,.2);
          color: #86efac;
        }

        .status.ready {
          background: rgba(59,130,246,.2);
          color: #93c5fd;
        }

        .status.locked {
          background: rgba(148,163,184,.2);
          color: #cbd5e1;
        }

        .bottomRow {
          display: flex;
          justify-content: space-between;
          margin-top: 14px;
          color: #94a3b8;
        }

        .navLinks {
          display: flex;
          justify-content: space-between;
          margin-top: 24px;
        }

        .navLinks a {
          color: #60a5fa;
          text-decoration: none;
          font-weight: 800;
        }

        @media (max-width: 800px) {
          .hero {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </main>
  );
}
