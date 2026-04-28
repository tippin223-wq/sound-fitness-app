"use client";

import React, { useState } from "react";

export default function LogWorkoutPage() {
  const [effort, setEffort] = useState(7);

  return (
    <main className="logPage">
      <section className="hero">
        <div>
          <p className="eyebrow">Optional Tracking</p>
          <h1>Log Workout</h1>
          <p>
            Record a completed workout quickly: what you did, how hard it felt,
            and any notes that matter for future programming.
          </p>
        </div>

        <div className="summaryCard">
          <span>{effort}/10</span>
          <h2>Effort</h2>
          <p>Current workout rating</p>
        </div>
      </section>

      <section className="layout">
        <section className="mainPanel">
          <div className="panelHeader">
            <div>
              <p className="eyebrow">Workout Log</p>
              <h2>Session Details</h2>
            </div>
            <a href="/workout-builder/tracking">Back to Tracking</a>
          </div>

          <div className="formGrid">
            <label>
              <span>Workout Name</span>
              <input defaultValue="Lower Body Strength" />
            </label>

            <label>
              <span>Date</span>
              <input type="date" />
            </label>

            <label>
              <span>Duration</span>
              <input placeholder="45 min" />
            </label>

            <label>
              <span>Client / Program</span>
              <input placeholder="Optional" />
            </label>
          </div>

          <div className="effortBox">
            <h2>Effort Rating</h2>
            <div className="ratingGrid">
              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((num) => (
                <button
                  key={num}
                  onClick={() => setEffort(num)}
                  className={effort === num ? "active" : ""}
                >
                  {num}
                </button>
              ))}
            </div>
          </div>

          <label className="notes">
            <span>Notes</span>
            <textarea placeholder="Energy, soreness, pain, wins, adjustments, or anything worth remembering..." />
          </label>

          <div className="actions">
            <a href="/workout-builder/tracking/progress">Save Log</a>
            <a href="/workout-builder/tracking">Cancel</a>
          </div>
        </section>

        <aside className="sidePanel">
          <div className="coachCard">
            <p className="eyebrow">Best Practice</p>
            <h2>Track only what helps</h2>
            <ul>
              <li>Effort tells you if the dose was right.</li>
              <li>Notes help you adjust next time.</li>
              <li>Pain notes should change the plan.</li>
              <li>Simple logs are better than skipped logs.</li>
            </ul>
          </div>

          <div className="quickLinks">
            <h2>Quick Links</h2>
            <a href="/workout-builder/tracking">Tracking Home</a>
            <a href="/workout-builder/tracking/progress">Basic Progress</a>
            <a href="/workout-builder/saved">Saved Workouts</a>
          </div>
        </aside>
      </section>

      <style>{`
        .logPage {
          min-height: 100vh;
          padding: 28px;
          color: #f8fafc;
          background:
            radial-gradient(circle at top left, rgba(37,99,235,.25), transparent 34%),
            radial-gradient(circle at top right, rgba(249,115,22,.18), transparent 30%),
            #070707;
          font-family: Inter, system-ui, sans-serif;
        }

        .hero,
        .layout {
          display: grid;
          grid-template-columns: 1fr 340px;
          gap: 22px;
          align-items: start;
        }

        .hero {
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
          font-size: 56px;
          font-weight: 950;
          letter-spacing: -.07em;
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
        .effortBox h2 {
          margin: 0 0 10px;
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
          background: linear-gradient(135deg, #f97316, #fb923c);
        }

        .formGrid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 12px;
          margin-bottom: 20px;
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

        input,
        textarea {
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

        textarea {
          min-height: 150px;
          resize: vertical;
        }

        input::placeholder,
        textarea::placeholder {
          color: #64748b;
        }

        .effortBox {
          margin-bottom: 20px;
        }

        .ratingGrid {
          display: grid;
          grid-template-columns: repeat(10, 1fr);
          gap: 8px;
        }

        .ratingGrid button {
          height: 44px;
          border-radius: 14px;
          border: 1px solid rgba(148,163,184,.18);
          background: rgba(255,255,255,.06);
          color: white;
          font-weight: 900;
          cursor: pointer;
        }

        .ratingGrid button.active,
        .ratingGrid button:hover {
          background: linear-gradient(135deg, #2563eb, #f97316);
          border-color: transparent;
        }

        .actions {
          display: flex;
          gap: 10px;
          flex-wrap: wrap;
          margin-top: 18px;
        }

        .actions a:first-child {
          background: linear-gradient(135deg, #2563eb, #0ea5e9);
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
          .formGrid {
            grid-template-columns: 1fr;
          }

          .panelHeader {
            align-items: flex-start;
            flex-direction: column;
          }
        }

        @media (max-width: 700px) {
          .logPage {
            padding: 16px;
          }

          .ratingGrid {
            grid-template-columns: repeat(5, 1fr);
          }

          .panelHeader a,
          .actions a {
            width: 100%;
            text-align: center;
          }
        }
      `}</style>
    </main>
  );
}
