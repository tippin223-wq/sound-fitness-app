"use client";

import React, { useState } from "react";

export default function IntakeCheckInPage() {
  const [readiness, setReadiness] = useState(7);

  return (
    <main className="checkInPage">
      <section className="hero">
        <div>
          <p className="eyebrow">Onboarding</p>
          <h1>Intake Check-In</h1>
          <p>
            Final readiness check before training starts. This helps Joey adjust
            the first session, intensity, and coaching approach.
          </p>
        </div>

        <div className="scoreCard">
          <span>{readiness}/10</span>
          <h2>Readiness</h2>
          <p>How ready you feel today</p>
        </div>
      </section>

      <section className="layout">
        <section className="panel">
          <div className="panelHeader">
            <div>
              <p className="eyebrow">Client Setup</p>
              <h2>Quick Check-In</h2>
            </div>
            <a href="/onboarding/confirmation">Finish</a>
          </div>

          <div className="formGrid">
            <label>
              <span>Energy Level</span>
              <select>
                <option>High</option>
                <option>Medium</option>
                <option>Low</option>
              </select>
            </label>

            <label>
              <span>Sleep Last Night</span>
              <select>
                <option>Good</option>
                <option>Okay</option>
                <option>Poor</option>
              </select>
            </label>

            <label>
              <span>Current Pain?</span>
              <select>
                <option>No pain</option>
                <option>Mild discomfort</option>
                <option>Moderate pain</option>
                <option>Sharp pain</option>
              </select>
            </label>

            <label>
              <span>Preferred Coaching Style</span>
              <select>
                <option>Encouraging</option>
                <option>Direct</option>
                <option>Detailed</option>
                <option>Simple and calm</option>
              </select>
            </label>
          </div>

          <div className="ratingBox">
            <h2>Training Readiness</h2>
            <div className="ratings">
              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((num) => (
                <button
                  key={num}
                  onClick={() => setReadiness(num)}
                  className={readiness === num ? "active" : ""}
                >
                  {num}
                </button>
              ))}
            </div>
          </div>

          <label className="notes">
            <span>Anything Joey should know?</span>
            <textarea placeholder="Pain, nerves, goals, schedule issues, injuries, preferences, or anything you want handled carefully..." />
          </label>

          <div className="actions">
            <a href="/onboarding/subscription">Back</a>
            <a href="/onboarding/confirmation">Complete Onboarding</a>
          </div>
        </section>

        <aside className="sidePanel">
          <div className="coachCard">
            <p className="eyebrow">Why this matters</p>
            <h2>Better first session</h2>
            <ul>
              <li>Adjust intensity before training starts.</li>
              <li>Flag pain or movement concerns early.</li>
              <li>Set expectations for coaching style.</li>
              <li>Help the client feel seen before session one.</li>
            </ul>
          </div>

          <div className="quickLinks">
            <h2>Onboarding</h2>
            <a href="/onboarding/assessment">Assessment</a>
            <a href="/onboarding/subscription">Subscription</a>
            <a href="/onboarding/confirmation">Confirmation</a>
          </div>
        </aside>
      </section>

      <style>{`
        .checkInPage {
          min-height: 100vh;
          padding: 28px;
          color: #f8fafc;
          background:
            radial-gradient(circle at top left, rgba(37,99,235,.28), transparent 34%),
            radial-gradient(circle at top right, rgba(249,115,22,.2), transparent 30%),
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

        .scoreCard,
        .panel,
        .coachCard,
        .quickLinks {
          background: rgba(15,23,42,.76);
          border: 1px solid rgba(148,163,184,.18);
          box-shadow: 0 24px 80px rgba(0,0,0,.35);
          border-radius: 28px;
          backdrop-filter: blur(18px);
          padding: 24px;
        }

        .scoreCard span {
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
        .ratingBox h2,
        .coachCard h2,
        .quickLinks h2 {
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

        select,
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

        textarea::placeholder {
          color: #64748b;
        }

        .ratingBox {
          margin-bottom: 20px;
        }

        .ratings {
          display: grid;
          grid-template-columns: repeat(10, 1fr);
          gap: 8px;
        }

        .ratings button {
          height: 44px;
          border-radius: 14px;
          border: 1px solid rgba(148,163,184,.18);
          background: rgba(255,255,255,.06);
          color: white;
          font-weight: 900;
          cursor: pointer;
        }

        .ratings button.active,
        .ratings button:hover {
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
          .checkInPage {
            padding: 16px;
          }

          .ratings {
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
