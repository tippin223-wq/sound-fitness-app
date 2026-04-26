"use client";

import React, { useState } from "react";

const starterMessages = [
  {
    from: "coach",
    name: "Joey",
    text: "Nice work this week. Focus on clean reps and logging honestly before we increase load.",
    time: "Today",
  },
  {
    from: "client",
    name: "You",
    text: "My knees felt okay on squats, but split squats were harder than expected.",
    time: "Yesterday",
  },
  {
    from: "coach",
    name: "Joey",
    text: "Good note. Keep the split squat range smaller next time and control the lowering phase.",
    time: "Yesterday",
  },
];

export default function ProgramMessagingPage() {
  const [message, setMessage] = useState("");

  return (
    <main className="messagesPage">
      <section className="hero">
        <div>
          <p className="eyebrow">Online Program</p>
          <h1>Program Messaging</h1>
          <p>
            Ask questions, report pain, share wins, and get coaching support
            between workouts.
          </p>
        </div>

        <div className="statusCard">
          <span>24h</span>
          <h2>Typical Response</h2>
          <p>Best for training questions, form notes, and weekly check-ins.</p>
        </div>
      </section>

      <section className="layout">
        <section className="chatPanel">
          <div className="panelHeader">
            <div>
              <p className="eyebrow">Coach Chat</p>
              <h2>Messages</h2>
            </div>
            <a href="/online-program">Back to Dashboard</a>
          </div>

          <div className="messageList">
            {starterMessages.map((item, index) => (
              <div className={`message ${item.from}`} key={index}>
                <div>
                  <strong>{item.name}</strong>
                  <small>{item.time}</small>
                </div>
                <p>{item.text}</p>
              </div>
            ))}
          </div>

          <div className="composer">
            <textarea
              value={message}
              onChange={(event) => setMessage(event.target.value)}
              placeholder="Message Joey about your workout, pain, energy, schedule, or progress..."
            />
            <button onClick={() => setMessage("")}>Send Message</button>
          </div>
        </section>

        <aside className="sidePanel">
          <div className="coachCard">
            <p className="eyebrow">Best Use</p>
            <h2>What to send</h2>
            <ul>
              <li>Workout questions</li>
              <li>Pain or discomfort updates</li>
              <li>Form video notes</li>
              <li>Schedule issues</li>
              <li>Wins and progress updates</li>
            </ul>
          </div>

          <div className="quickLinks">
            <h2>Quick Links</h2>
            <a href="/online-program/weekly-plan">Weekly Plan</a>
            <a href="/online-program/workouts">Program Workouts</a>
            <a href="/online-program/progress">Program Progress</a>
          </div>
        </aside>
      </section>

      <style>{`
        .messagesPage {
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

        .statusCard,
        .chatPanel,
        .coachCard,
        .quickLinks {
          background: rgba(15,23,42,.76);
          border: 1px solid rgba(148,163,184,.18);
          box-shadow: 0 24px 80px rgba(0,0,0,.35);
          border-radius: 28px;
          backdrop-filter: blur(18px);
          padding: 24px;
        }

        .statusCard span {
          font-size: 60px;
          font-weight: 950;
          letter-spacing: -.07em;
        }

        .statusCard h2 {
          margin: 4px 0 8px;
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
          align-items: center;
          gap: 16px;
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
          color: white;
          text-decoration: none;
          font-weight: 900;
          border-radius: 16px;
          padding: 12px 16px;
          background: linear-gradient(135deg, #f97316, #fb923c);
        }

        .messageList {
          display: grid;
          gap: 12px;
          margin-bottom: 18px;
        }

        .message {
          max-width: 78%;
          padding: 15px;
          border-radius: 22px;
          background: rgba(255,255,255,.06);
          border: 1px solid rgba(148,163,184,.12);
        }

        .message.client {
          margin-left: auto;
          background: rgba(249,115,22,.14);
          border-color: rgba(249,115,22,.3);
        }

        .message.coach {
          margin-right: auto;
          background: rgba(37,99,235,.14);
          border-color: rgba(96,165,250,.3);
        }

        .message div {
          display: flex;
          justify-content: space-between;
          gap: 10px;
          margin-bottom: 6px;
        }

        .message small {
          color: #94a3b8;
        }

        .message p {
          color: #e2e8f0;
          line-height: 1.55;
          margin: 0;
        }

        .composer {
          display: grid;
          gap: 12px;
        }

        textarea {
          width: 100%;
          min-height: 140px;
          box-sizing: border-box;
          border-radius: 20px;
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

        .composer button {
          border: 0;
          cursor: pointer;
          color: white;
          font-weight: 900;
          border-radius: 16px;
          padding: 14px 18px;
          background: linear-gradient(135deg, #2563eb, #0ea5e9);
          font-family: inherit;
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
          font-weight: 900;
        }

        @media (max-width: 1000px) {
          .hero,
          .layout {
            grid-template-columns: 1fr;
          }

          .panelHeader {
            align-items: flex-start;
            flex-direction: column;
          }
        }

        @media (max-width: 640px) {
          .messagesPage {
            padding: 16px;
          }

          .message {
            max-width: 100%;
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
