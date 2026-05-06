"use client";

import React from "react";
import { ROUTES } from "@/lib/routes";

const steps = [
  {
    title: "Assessment",
    desc: "Goals, training history, pain, schedule, equipment, and readiness.",
    href: ROUTES.onboarding.assessment,
    status: "Step 1",
  },
  {
    title: "Subscription",
    desc: "Choose training package, membership, or online coaching option.",
    href: ROUTES.onboarding.subscription,
    status: "Step 2",
  },
  {
    title: "Intake Check-In",
    desc: "Final readiness check before training starts.",
    href: ROUTES.onboarding.intakeCheckIn,
    status: "Step 3",
  },
  {
    title: "Confirmation",
    desc: "Thank-you page with next steps, dashboard link, and coach expectations.",
    href: ROUTES.onboarding.confirmation,
    status: "Finish",
  },
];

export default function OnboardingPage() {
  return (
    <main className="onboardingPage">
      <section className="hero">
        <div>
          <p className="eyebrow">Sound Fitness</p>
          <h1>Client Onboarding</h1>
          <p>
            Complete the setup steps so Joey can build the right training plan,
            schedule, and support system for you.
          </p>

          <div className="actions">
            <a href={ROUTES.onboarding.assessment}>Start Assessment</a>
            <a href={ROUTES.dashboard.home}>Go to Dashboard</a>
          </div>
        </div>

        <div className="summaryCard">
          <span>4</span>
          <h2>Setup Steps</h2>
          <p>Assessment → Subscription → Check-In → Confirmation</p>
        </div>
      </section>

      <section className="stepGrid">
        {steps.map((step) => (
          <a className="stepCard" href={step.href} key={step.title}>
            <div className="topLine">
              <span>{step.status}</span>
              <strong>→</strong>
            </div>
            <h2>{step.title}</h2>
            <p>{step.desc}</p>
          </a>
        ))}
      </section>

      <section className="bottomPanel">
        <div>
          <p className="eyebrow">Best Practice</p>
          <h2>Keep onboarding simple.</h2>
          <p>
            This should feel like a guided setup, not paperwork. The client
            should always know what step they are on and what happens next.
          </p>
        </div>

        <div className="quickLinks">
          <a href={ROUTES.public.home}>Login</a>
          <a href={ROUTES.admin.siteMap}>Site Map</a>
          <a href={ROUTES.dashboard.home}>Dashboard</a>
        </div>
      </section>

      <style>{`
        .onboardingPage {
          min-height: 100vh;
          padding: 28px;
          color: #f8fafc;
          background:
            radial-gradient(circle at top left, rgba(37,99,235,.28), transparent 34%),
            radial-gradient(circle at top right, rgba(249,115,22,.2), transparent 30%),
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
          font-size: clamp(46px, 8vw, 92px);
          line-height: .88;
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

        .actions {
          display: flex;
          gap: 12px;
          flex-wrap: wrap;
          margin-top: 24px;
        }

        .actions a,
        .quickLinks a {
          color: white;
          text-decoration: none;
          font-weight: 900;
          border-radius: 16px;
          padding: 13px 17px;
          background: linear-gradient(135deg, #2563eb, #0ea5e9);
        }

        .actions a:first-child {
          background: linear-gradient(135deg, #f97316, #fb923c);
        }

        .summaryCard,
        .stepCard,
        .bottomPanel {
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

        .stepGrid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 16px;
          margin-bottom: 22px;
        }

        .stepCard {
          color: white;
          text-decoration: none;
        }

        .stepCard:hover {
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

        .stepCard h2,
        .bottomPanel h2 {
          margin: 0 0 10px;
          font-size: 26px;
          letter-spacing: -.04em;
        }

        .stepCard p,
        .bottomPanel p {
          color: #cbd5e1;
          line-height: 1.6;
        }

        .bottomPanel {
          display: grid;
          grid-template-columns: 1fr 320px;
          gap: 20px;
          align-items: center;
        }

        .quickLinks {
          display: grid;
          gap: 10px;
        }

        .quickLinks a {
          background: rgba(255,255,255,.055);
          border: 1px solid rgba(148,163,184,.12);
        }

        @media (max-width: 1100px) {
          .hero,
          .bottomPanel {
            grid-template-columns: 1fr;
          }

          .stepGrid {
            grid-template-columns: repeat(2, 1fr);
          }
        }

        @media (max-width: 640px) {
          .onboardingPage {
            padding: 16px;
          }

          .stepGrid {
            grid-template-columns: 1fr;
          }

          .actions a {
            width: 100%;
            text-align: center;
          }
        }
      `}</style>
    </main>
  );
}
