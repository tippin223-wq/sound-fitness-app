"use client";

import React, { useState } from "react";

export default function SaveWorkoutPage() {
  const [saveType, setSaveType] = useState("Template");

  return (
    <main className="savePage">
      <section className="hero">
        <div>
          <p className="eyebrow">Workout Builder</p>
          <h1>Save Workout</h1>
          <p>
            Review the workout, choose how it should be saved, then assign it or
            store it as a reusable template.
          </p>
        </div>

        <div className="summaryCard">
          <span>3</span>
          <h2>Exercises</h2>
          <p>Lower Body Strength Template</p>
        </div>
      </section>

      <section className="layout">
        <section className="mainPanel">
          <div className="panelHeader">
            <div>
              <p className="eyebrow">Final Review</p>
              <h2>Workout Summary</h2>
            </div>
            <a href="/dashboard/workout-builder/build">Edit Workout</a>
          </div>

          <div className="workoutName">
            <label>
              <span>Workout Name</span>
              <input defaultValue="Lower Body Strength Template" />
            </label>

            <label>
              <span>Workout Goal</span>
              <input defaultValue="Build lower body strength with clean movement" />
            </label>
          </div>

          <div className="reviewList">
            <div className="row">
              <strong>Goblet Squat</strong>
              <span>3 sets</span>
              <span>8–10 reps</span>
              <span>75 sec rest</span>
            </div>

            <div className="row">
              <strong>Romanian Deadlift</strong>
              <span>3 sets</span>
              <span>8–10 reps</span>
              <span>90 sec rest</span>
            </div>

            <div className="row">
              <strong>Split Squat</strong>
              <span>2 sets</span>
              <span>8 / side</span>
              <span>60 sec rest</span>
            </div>
          </div>

          <div className="saveOptions">
            <h2>Save As</h2>

            {["Template", "Client Workout", "Program Workout"].map((type) => (
              <button
                key={type}
                onClick={() => setSaveType(type)}
                className={saveType === type ? "active" : ""}
              >
                {type}
              </button>
            ))}
          </div>

          <div className="actions">
            <a href="/dashboard/workout-builder/saved">Save Workout</a>
            <a href="/dashboard/workout-builder/build/sets-reps">Back to Sets / Reps</a>
          </div>
        </section>

        <aside className="sidePanel">
          <div className="coachCard">
            <p className="eyebrow">Best Practice</p>
            <h2>Save clean templates</h2>
            <ul>
              <li>Use clear names.</li>
              <li>Label the training goal.</li>
              <li>Keep notes coach-friendly.</li>
              <li>Duplicate templates instead of rebuilding from scratch.</li>
            </ul>
          </div>

          <div className="quickLinks">
            <h2>Quick Links</h2>
            <a href="/dashboard/workout-builder/build/add-exercises">Add Exercises</a>
            <a href="/dashboard/workout-builder/build/sets-reps">Sets / Reps</a>
            <a href="/dashboard/workout-builder/saved">Saved Workouts</a>
          </div>
        </aside>
      </section>

      <style>{`
        .savePage {
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

        .summaryCard p {
          color: #94a3b8;
          margin: 0;
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
        .saveOptions h2,
        .coachCard h2,
        .quickLinks h2 {
          margin: 0;
          font-size: 28px;
          letter-spacing: -.04em;
        }

        .panelHeader a,
        .actions a,
        .quickLinks a {
          color: white;
          text-decoration: none;
          font-weight: 900;
          border-radius: 16px;
          padding: 12px 16px;
          background: linear-gradient(135deg, #2563eb, #0ea5e9);
        }

        .panelHeader a {
          background: rgba(255,255,255,.1);
        }

        .workoutName {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 12px;
          margin-bottom: 18px;
        }

        label {
          display: grid;
          gap: 8px;
        }

        label span {
          color: #94a3b8;
          font-size: 12px;
          font-weight: 900;
          text-transform: uppercase;
          letter-spacing: .08em;
        }

        input {
          width: 100%;
          box-sizing: border-box;
          border-radius: 14px;
          border: 1px solid rgba(148,163,184,.18);
          background: rgba(0,0,0,.22);
          color: white;
          padding: 12px;
          outline: none;
          font-family: inherit;
        }

        .reviewList {
          display: grid;
          gap: 10px;
          margin-bottom: 22px;
        }

        .row {
          display: grid;
          grid-template-columns: 1.5fr .8fr .8fr .8fr;
          gap: 10px;
          align-items: center;
          background: rgba(255,255,255,.055);
          border: 1px solid rgba(148,163,184,.12);
          border-radius: 18px;
          padding: 14px;
        }

        .row span {
          color: #cbd5e1;
        }

        .saveOptions {
          display: flex;
          gap: 10px;
          flex-wrap: wrap;
          align-items: center;
          margin-bottom: 18px;
        }

        .saveOptions h2 {
          width: 100%;
        }

        .saveOptions button {
          border: 1px solid rgba(148,163,184,.16);
          background: rgba(255,255,255,.06);
          color: white;
          border-radius: 999px;
          padding: 10px 14px;
          font-weight: 900;
          cursor: pointer;
          font-family: inherit;
        }

        .saveOptions button.active {
          background: linear-gradient(135deg, #f97316, #fb923c);
          border-color: transparent;
        }

        .actions {
          display: flex;
          gap: 10px;
          flex-wrap: wrap;
        }

        .actions a:first-child {
          background: linear-gradient(135deg, #f97316, #fb923c);
        }

        .actions a:last-child {
          background: rgba(255,255,255,.1);
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
          background: rgba(255,255,255,.055);
          border: 1px solid rgba(148,163,184,.12);
        }

        @media (max-width: 1000px) {
          .hero,
          .layout,
          .workoutName {
            grid-template-columns: 1fr;
          }

          .panelHeader {
            align-items: flex-start;
            flex-direction: column;
          }
        }

        @media (max-width: 700px) {
          .savePage {
            padding: 16px;
          }

          .row {
            grid-template-columns: 1fr;
          }

          .actions a,
          .panelHeader a {
            width: 100%;
            text-align: center;
          }
        }
      `}</style>
    </main>
  );
}
