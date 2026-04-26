"use client";

import React, { useState } from "react";

export default function CompleteWorkoutPage() {
  const [rating, setRating] = useState<number | null>(null);

  return (
    <main className="completePage">
      <section className="hero">
        <p className="eyebrow">Workout Complete</p>
        <h1>Nice work.</h1>
        <p>
          Log how the workout felt, review what you finished, and move into
          recovery.
        </p>
      </section>

      <section className="layout">
        <div className="completeCard">
          <div className="check">✓</div>
          <h2>Lower Body Foundation Complete</h2>
          <p>
            You completed the workout. Your next step is to recover well and
            stay consistent.
          </p>

          <div className="summaryGrid">
            <div>
              <span>Exercises</span>
              <strong>4</strong>
            </div>
            <div>
              <span>Sets Logged</span>
              <strong>11</strong>
            </div>
            <div>
              <span>Time</span>
              <strong>48 min</strong>
            </div>
          </div>

          <div className="ratingBox">
            <h3>How hard did it feel?</h3>
            <div className="ratings">
              {[1, 2, 3, 4, 5].map((number) => (
                <button
                  key={number}
                  onClick={() => setRating(number)}
                  className={rating === number ? "active" : ""}
                >
                  {number}
                </button>
              ))}
            </div>
          </div>

          <textarea placeholder="Workout notes: energy, pain, soreness, wins, anything Joey should know..." />

          <div className="actions">
            <a href="/online-program/workouts">Back to Workouts</a>
            <a href="/online-program/progress">View Progress</a>
          </div>
        </div>

        <aside className="sidePanel">
          <div className="coachCard">
            <p className="eyebrow">Coach Reminder</p>
            <h2>Recovery matters</h2>
            <ul>
              <li>Get protein after training.</li>
              <li>Walk or move lightly if sore.</li>
              <li>Hydrate before bed.</li>
              <li>Log pain honestly if anything felt off.</li>
            </ul>
          </div>

          <div className="nextCard">
            <h2>Next Suggested Step</h2>
            <p>Review your weekly plan and see what workout comes next.</p>
            <a href="/online-program/weekly-plan">Open Weekly Plan</a>
          </div>
        </aside>
      </section>

      <style>{`
        .completePage {
          min-height: 100vh;
          padding: 28px;
          color: #f8fafc;
          background:
            radial-gradient(circle at top left, rgba(34,197,94,.18), transparent 34%),
            radial-gradient(circle at top right, rgba(249,115,22,.2), transparent 30%),
            #070707;
          font-family: Inter, system-ui, sans-serif;
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
          font-size: clamp(48px, 9vw, 96px);
          line-height: .9;
          letter-spacing: -.07em;
          margin: 0;
        }

        .hero p {
          color: #cbd5e1;
          font-size: 18px;
          line-height: 1.7;
          margin-top: 18px;
        }

        .layout {
          display: grid;
          grid-template-columns: 1fr 340px;
          gap: 20px;
          align-items: start;
        }

        .completeCard,
        .coachCard,
        .nextCard {
          background: rgba(15,23,42,.76);
          border: 1px solid rgba(148,163,184,.18);
          box-shadow: 0 24px 80px rgba(0,0,0,.35);
          border-radius: 28px;
          backdrop-filter: blur(18px);
          padding: 24px;
        }

        .check {
          width: 78px;
          height: 78px;
          display: grid;
          place-items: center;
          border-radius: 999px;
          background: rgba(34,197,94,.18);
          color: #86efac;
          font-size: 44px;
          font-weight: 950;
          margin-bottom: 18px;
        }

        h2 {
          margin: 0 0 12px;
          font-size: 30px;
          letter-spacing: -.04em;
        }

        .completeCard p,
        .nextCard p,
        li {
          color: #cbd5e1;
          line-height: 1.65;
        }

        .summaryGrid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 12px;
          margin: 22px 0;
        }

        .summaryGrid div {
          background: rgba(255,255,255,.055);
          border: 1px solid rgba(148,163,184,.12);
          border-radius: 18px;
          padding: 16px;
          display: grid;
          gap: 6px;
        }

        .summaryGrid span {
          color: #94a3b8;
          font-size: 12px;
          text-transform: uppercase;
          letter-spacing: .08em;
          font-weight: 900;
        }

        .summaryGrid strong {
          font-size: 26px;
        }

        .ratingBox {
          margin: 20px 0;
        }

        .ratingBox h3 {
          margin: 0 0 12px;
        }

        .ratings {
          display: flex;
          gap: 10px;
          flex-wrap: wrap;
        }

        .ratings button {
          width: 48px;
          height: 48px;
          border-radius: 16px;
          border: 1px solid rgba(148,163,184,.16);
          background: rgba(255,255,255,.07);
          color: white;
          font-weight: 950;
          cursor: pointer;
        }

        .ratings button.active,
        .ratings button:hover {
          background: linear-gradient(135deg, #2563eb, #f97316);
          border-color: transparent;
        }

        textarea {
          width: 100%;
          min-height: 150px;
          box-sizing: border-box;
          border-radius: 18px;
          border: 1px solid rgba(148,163,184,.18);
          background: rgba(0,0,0,.22);
          color: white;
          padding: 14px;
          outline: none;
          resize: vertical;
          font-family: inherit;
        }

        textarea::placeholder {
          color: #94a3b8;
        }

        .actions {
          display: flex;
          gap: 12px;
          flex-wrap: wrap;
          margin-top: 18px;
        }

        .actions a,
        .nextCard a {
          color: white;
          text-decoration: none;
          font-weight: 900;
          border-radius: 16px;
          padding: 13px 17px;
          background: linear-gradient(135deg, #2563eb, #0ea5e9);
        }

        .actions a:last-child,
        .nextCard a {
          background: linear-gradient(135deg, #f97316, #fb923c);
        }

        .sidePanel {
          display: grid;
          gap: 16px;
        }

        ul {
          margin: 14px 0 0;
          padding-left: 20px;
        }

        .nextCard a {
          display: inline-block;
          margin-top: 10px;
        }

        @media (max-width: 900px) {
          .layout,
          .summaryGrid {
            grid-template-columns: 1fr;
          }
        }

        @media (max-width: 640px) {
          .completePage {
            padding: 16px;
          }

          .actions a,
          .nextCard a {
            width: 100%;
            text-align: center;
          }
        }
      `}</style>
    </main>
  );
}
