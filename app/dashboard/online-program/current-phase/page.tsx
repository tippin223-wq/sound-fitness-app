"use client";

import React from "react";

export default function CurrentPhasePage() {
  return (
    <main className="phasePage">
      <section className="hero">
        <p className="eyebrow">Online Program</p>
        <h1>Current Phase</h1>
        <p>
          This page explains what phase the client is in, why it matters, what
          they should focus on, and what progress looks like.
        </p>
      </section>

      <section className="grid">
        <div className="mainCard">
          <p className="label">Current Training Block</p>
          <h2>Foundation Strength</h2>
          <p>
            The goal of this phase is to build clean movement, consistent
            training habits, and a strong base before adding heavier loads or
            more complex exercises.
          </p>

          <div className="progressWrap">
            <div className="progressTop">
              <span>Phase Progress</span>
              <strong>Week 2 of 6</strong>
            </div>
            <div className="progressBar">
              <div />
            </div>
          </div>
        </div>

        <div className="sideCard">
          <p className="label">Coach Priority</p>
          <h2>This Week</h2>
          <ul>
            <li>Control every rep</li>
            <li>Log workouts honestly</li>
            <li>Do not chase max weight yet</li>
            <li>Focus on repeatable technique</li>
          </ul>
        </div>
      </section>

      <section className="cards">
        <a href="/online-program/weekly-plan">
          <strong>Weekly Plan</strong>
          <span>See your schedule and training days</span>
        </a>

        <a href="/online-program/workouts">
          <strong>Program Workouts</strong>
          <span>Start or review your assigned workouts</span>
        </a>

        <a href="/online-program/progress">
          <strong>Program Progress</strong>
          <span>Track strength, completion, and streak</span>
        </a>
      </section>

      <style>{`
        .phasePage {
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
          margin-bottom: 24px;
        }

        .eyebrow,
        .label {
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

        .grid {
          display: grid;
          grid-template-columns: 1fr 360px;
          gap: 20px;
          margin-bottom: 20px;
        }

        .mainCard,
        .sideCard,
        .cards a {
          background: rgba(15, 23, 42, .76);
          border: 1px solid rgba(148, 163, 184, .18);
          box-shadow: 0 24px 80px rgba(0,0,0,.35);
          border-radius: 28px;
          backdrop-filter: blur(18px);
        }

        .mainCard,
        .sideCard {
          padding: 26px;
        }

        h2 {
          margin: 0 0 12px;
          font-size: 32px;
          letter-spacing: -.04em;
        }

        .mainCard p,
        .sideCard li {
          color: #cbd5e1;
          line-height: 1.65;
        }

        .progressWrap {
          margin-top: 28px;
        }

        .progressTop {
          display: flex;
          justify-content: space-between;
          color: #cbd5e1;
          margin-bottom: 10px;
        }

        .progressTop strong {
          color: #f8fafc;
        }

        .progressBar {
          height: 12px;
          border-radius: 999px;
          overflow: hidden;
          background: rgba(255,255,255,.08);
        }

        .progressBar div {
          height: 100%;
          width: 33%;
          background: linear-gradient(90deg, #2563eb, #38bdf8, #f97316);
        }

        ul {
          margin: 0;
          padding-left: 20px;
        }

        .cards {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 16px;
        }

        .cards a {
          padding: 22px;
          color: white;
          text-decoration: none;
          display: grid;
          gap: 8px;
        }

        .cards a:hover {
          border-color: rgba(249, 115, 22, .45);
          transform: translateY(-2px);
        }

        .cards strong {
          font-size: 20px;
        }

        .cards span {
          color: #94a3b8;
          line-height: 1.5;
        }

        @media (max-width: 900px) {
          .grid,
          .cards {
            grid-template-columns: 1fr;
          }
        }

        @media (max-width: 640px) {
          .phasePage {
            padding: 16px;
          }
        }
      `}</style>
    </main>
  );
}
