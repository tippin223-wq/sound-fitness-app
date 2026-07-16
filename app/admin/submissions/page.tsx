"use client";

import Link from "next/link";
import {
  AlertCircle,
  CheckCircle2,
  ClipboardList,
  Mail,
  Phone,
  RefreshCw,
  Search,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ROUTES } from "@/lib/routes";
import { supabase } from "@/lib/supabaseClient";

type Submission = {
  answers: Record<string, unknown>;
  created_at: string;
  email: string;
  email_error: string | null;
  emailed_at: string | null;
  full_name: string | null;
  id: string;
  phone: string | null;
  result_focus: string | null;
  result_title: string | null;
  service_pills: string[] | null;
};

type SubmissionsResponse = {
  error?: string;
  generatedAt?: string;
  submissions?: Submission[];
};

const answerLabels: Record<string, string> = {
  cityZip: "City / ZIP",
  coachingStyle: "Coaching style",
  contactConsent: "Contact consent",
  contactPreference: "Contact preference",
  email: "Email",
  equipment: "Equipment",
  experience: "Experience",
  firstName: "First name",
  introSessionInterest: "Intro session",
  limitation: "Limitations",
  mainGoal: "Main goal",
  movementConfidence: "Movement confidence",
  phone: "Phone",
  recoveryBaseline: "Recovery baseline",
  sessionLength: "Session length",
  trainingAvailability: "Training availability",
  trainingEnvironment: "Training environment",
  trainingStyle: "Training style",
};

function formatDate(value: string | null | undefined) {
  if (!value) return "Not sent";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Unknown";

  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function formatAnswerValue(value: unknown) {
  if (Array.isArray(value)) {
    return value.length ? value.join(", ") : "Not answered";
  }

  if (typeof value === "boolean") {
    return value ? "Yes" : "No";
  }

  if (typeof value === "string") {
    return value.trim() || "Not answered";
  }

  if (value === null || value === undefined) {
    return "Not answered";
  }

  if (typeof value === "number") {
    return String(value);
  }

  return JSON.stringify(value);
}

function getAnswerEntries(answers: Record<string, unknown>) {
  return Object.entries(answers)
    .filter(([key]) => key !== "email" && key !== "phone")
    .map(([key, value]) => ({
      label: answerLabels[key] ?? key,
      value: formatAnswerValue(value),
    }));
}

export default function AdminSubmissionsPage() {
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [errorMessage, setErrorMessage] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState("");
  const [query, setQuery] = useState("");
  const [activeSubmissionId, setActiveSubmissionId] = useState<string | null>(
    null,
  );

  const loadSubmissions = useCallback(async () => {
    setErrorMessage("");
    setIsLoading(true);

    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session?.access_token) {
      setSubmissions([]);
      setErrorMessage("Sign in as an admin to load submissions.");
      setIsLoading(false);
      return;
    }

    try {
      const response = await fetch("/api/admin/submissions", {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      const payload = (await response.json()) as SubmissionsResponse;

      if (!response.ok) {
        setSubmissions([]);
        setErrorMessage(payload.error ?? "Submissions could not be loaded.");
        return;
      }

      const nextSubmissions = payload.submissions ?? [];
      setSubmissions(nextSubmissions);
      setLastUpdated(payload.generatedAt ?? new Date().toISOString());
      setActiveSubmissionId((current) => current ?? nextSubmissions[0]?.id ?? null);
    } catch {
      setSubmissions([]);
      setErrorMessage("Submissions could not be loaded.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadSubmissions();
    }, 0);

    return () => window.clearTimeout(timer);
  }, [loadSubmissions]);

  const filteredSubmissions = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return submissions;

    return submissions.filter((submission) => {
      const searchable = [
        submission.email,
        submission.full_name,
        submission.phone,
        submission.result_focus,
        submission.result_title,
        ...(submission.service_pills ?? []),
        ...Object.values(submission.answers).map(formatAnswerValue),
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return searchable.includes(needle);
    });
  }, [query, submissions]);

  const activeSubmission =
    filteredSubmissions.find((submission) => submission.id === activeSubmissionId) ??
    filteredSubmissions[0] ??
    null;

  const stats = useMemo(() => {
    const failedEmail = submissions.filter((submission) => submission.email_error)
      .length;
    const emailed = submissions.filter((submission) => submission.emailed_at).length;

    return [
      {
        label: "Submissions",
        value: submissions.length,
        helper: "Latest 100 assessments",
      },
      {
        label: "Emailed",
        value: emailed,
        helper: "Result email sent",
      },
      {
        label: "Needs attention",
        value: failedEmail,
        helper: "Email delivery issue",
      },
    ];
  }, [submissions]);

  return (
    <main className="min-h-screen bg-[#020617] px-5 py-8 text-white">
      <section className="mx-auto max-w-7xl space-y-6">
        <header className="grid gap-4 rounded-3xl border border-white/10 bg-white/[0.05] p-6 shadow-2xl shadow-black/20 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
          <div>
            <p className="text-[11px] font-black uppercase tracking-[0.24em] text-cyan-300">
              Admin / Submissions
            </p>
            <h1 className="mt-3 text-4xl font-black uppercase leading-none tracking-tight">
              Submission Inbox
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-300">
              Review completed onboarding assessments, contact details, delivery
              status, and the answers visitors submitted.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <Link
              href={ROUTES.admin.leads}
              className="inline-flex min-h-11 items-center justify-center rounded-xl border border-white/10 bg-white/[0.05] px-4 text-xs font-black uppercase tracking-[0.13em] text-slate-200 transition hover:border-sky-300/45 hover:bg-sky-500/10"
            >
              Open leads
            </Link>
            <button
              type="button"
              onClick={() => void loadSubmissions()}
              disabled={isLoading}
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-cyan-300 px-4 text-xs font-black uppercase tracking-[0.13em] text-slate-950 transition hover:bg-cyan-200 disabled:cursor-wait disabled:opacity-70"
            >
              <RefreshCw
                aria-hidden="true"
                className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`}
              />
              Refresh
            </button>
          </div>
        </header>

        <section className="grid gap-4 sm:grid-cols-3">
          {stats.map((item) => (
            <div
              key={item.label}
              className="rounded-2xl border border-white/10 bg-slate-950/60 p-5"
            >
              <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">
                {item.label}
              </p>
              <p className="mt-2 text-3xl font-black text-white">{item.value}</p>
              <p className="mt-1 text-xs font-bold text-slate-500">
                {item.helper}
              </p>
            </div>
          ))}
        </section>

        <section className="grid gap-6 lg:grid-cols-[minmax(320px,0.9fr)_minmax(0,1.1fr)]">
          <div className="min-w-0 rounded-3xl border border-white/10 bg-white/[0.05] p-4 shadow-2xl shadow-black/20">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-[11px] font-black uppercase tracking-[0.2em] text-sky-300">
                  Inbox
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  Updated {lastUpdated ? formatDate(lastUpdated) : "after load"}
                </p>
              </div>
              <div className="relative">
                <Search
                  aria-hidden="true"
                  className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500"
                />
                <input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Search submissions"
                  className="min-h-10 w-full rounded-xl border border-white/10 bg-slate-950/70 pl-9 pr-3 text-sm font-bold text-white outline-none placeholder:text-slate-500 focus:border-cyan-300/50 sm:w-64"
                />
              </div>
            </div>

            {errorMessage ? (
              <div className="mt-4 rounded-2xl border border-amber-300/25 bg-amber-300/10 p-4 text-sm font-bold leading-6 text-amber-50">
                {errorMessage}
              </div>
            ) : null}

            <div className="mt-4 grid max-h-[680px] gap-3 overflow-y-auto pr-1">
              {isLoading ? (
                <div className="rounded-2xl border border-white/10 bg-slate-950/60 p-5 text-sm font-bold text-slate-300">
                  Loading submissions...
                </div>
              ) : null}

              {!isLoading && filteredSubmissions.length === 0 ? (
                <div className="rounded-2xl border border-white/10 bg-slate-950/60 p-5 text-sm font-bold text-slate-300">
                  No submissions found.
                </div>
              ) : null}

              {filteredSubmissions.map((submission) => {
                const active = activeSubmission?.id === submission.id;
                const hasEmailError = Boolean(submission.email_error);

                return (
                  <button
                    key={submission.id}
                    type="button"
                    onClick={() => setActiveSubmissionId(submission.id)}
                    className={`rounded-2xl border p-4 text-left transition ${
                      active
                        ? "border-cyan-300/60 bg-cyan-300/10 shadow-[0_0_28px_rgba(34,211,238,0.13)]"
                        : "border-white/10 bg-slate-950/60 hover:border-sky-300/35 hover:bg-sky-500/10"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-black text-white">
                          {submission.full_name || submission.email}
                        </p>
                        <p className="mt-1 truncate text-xs font-bold text-sky-200">
                          {submission.email}
                        </p>
                      </div>
                      <span
                        className={`shrink-0 rounded-full border px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.12em] ${
                          hasEmailError
                            ? "border-amber-300/30 bg-amber-300/10 text-amber-100"
                            : "border-emerald-300/30 bg-emerald-300/10 text-emerald-100"
                        }`}
                      >
                        {hasEmailError ? "Email issue" : "Stored"}
                      </span>
                    </div>
                    <p className="mt-3 text-xs leading-5 text-slate-400">
                      {submission.result_title || "Assessment completed"}
                    </p>
                    <p className="mt-2 text-[10px] font-black uppercase tracking-[0.14em] text-slate-500">
                      {formatDate(submission.created_at)}
                    </p>
                  </button>
                );
              })}
            </div>
          </div>

          <SubmissionDetail submission={activeSubmission} />
        </section>
      </section>
    </main>
  );
}

function SubmissionDetail({ submission }: { submission: Submission | null }) {
  if (!submission) {
    return (
      <aside className="rounded-3xl border border-white/10 bg-white/[0.05] p-6 shadow-2xl shadow-black/20">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-sky-300/25 bg-sky-300/10 text-sky-100">
          <ClipboardList aria-hidden="true" className="h-6 w-6" />
        </div>
        <h2 className="mt-4 text-2xl font-black text-white">
          Select a submission
        </h2>
        <p className="mt-2 text-sm leading-6 text-slate-400">
          New onboarding form submissions will appear here after visitors finish
          the assessment.
        </p>
      </aside>
    );
  }

  const answerEntries = getAnswerEntries(submission.answers || {});

  return (
    <aside className="min-w-0 rounded-3xl border border-white/10 bg-white/[0.05] p-6 shadow-2xl shadow-black/20">
      <div className="flex flex-col gap-4 border-b border-white/10 pb-5 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <p className="text-[11px] font-black uppercase tracking-[0.22em] text-cyan-300">
            Submission detail
          </p>
          <h2 className="mt-2 truncate text-3xl font-black text-white">
            {submission.full_name || "Unnamed lead"}
          </h2>
          <p className="mt-2 text-sm font-bold text-slate-400">
            Submitted {formatDate(submission.created_at)}
          </p>
        </div>
        <DeliveryBadge submission={submission} />
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        <a
          href={`mailto:${submission.email}`}
          className="rounded-2xl border border-white/10 bg-slate-950/60 p-4 transition hover:border-cyan-300/35 hover:bg-cyan-300/10"
        >
          <Mail aria-hidden="true" className="h-5 w-5 text-cyan-200" />
          <p className="mt-3 text-[10px] font-black uppercase tracking-[0.16em] text-slate-500">
            Email
          </p>
          <p className="mt-1 break-all text-sm font-bold text-white">
            {submission.email}
          </p>
        </a>

        <a
          href={submission.phone ? `tel:${submission.phone}` : undefined}
          className="rounded-2xl border border-white/10 bg-slate-950/60 p-4 transition hover:border-emerald-300/35 hover:bg-emerald-300/10"
        >
          <Phone aria-hidden="true" className="h-5 w-5 text-emerald-200" />
          <p className="mt-3 text-[10px] font-black uppercase tracking-[0.16em] text-slate-500">
            Phone
          </p>
          <p className="mt-1 break-all text-sm font-bold text-white">
            {submission.phone || "Not provided"}
          </p>
        </a>
      </div>

      <section className="mt-5 rounded-2xl border border-sky-300/20 bg-sky-300/10 p-5">
        <p className="text-[10px] font-black uppercase tracking-[0.18em] text-sky-200">
          Assessment result
        </p>
        <h3 className="mt-2 text-xl font-black text-white">
          {submission.result_title || "No result title"}
        </h3>
        <p className="mt-2 text-sm font-bold leading-6 text-slate-300">
          {submission.result_focus || "No focus saved"}
        </p>

        {submission.service_pills?.length ? (
          <div className="mt-4 flex flex-wrap gap-2">
            {submission.service_pills.map((pill) => (
              <span
                key={pill}
                className="rounded-full border border-cyan-200/25 bg-cyan-300/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.12em] text-cyan-100"
              >
                {pill}
              </span>
            ))}
          </div>
        ) : null}
      </section>

      {submission.email_error ? (
        <section className="mt-5 rounded-2xl border border-amber-300/25 bg-amber-300/10 p-4">
          <p className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.16em] text-amber-100">
            <AlertCircle aria-hidden="true" className="h-4 w-4" />
            Email delivery issue
          </p>
          <p className="mt-2 text-sm font-bold leading-6 text-amber-50">
            {submission.email_error}
          </p>
        </section>
      ) : null}

      <section className="mt-5">
        <p className="text-[11px] font-black uppercase tracking-[0.22em] text-slate-400">
          Submitted answers
        </p>
        <div className="mt-3 grid gap-3">
          {answerEntries.map((entry) => (
            <div
              key={entry.label}
              className="rounded-2xl border border-white/10 bg-slate-950/60 p-4"
            >
              <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-500">
                {entry.label}
              </p>
              <p className="mt-1 text-sm font-bold leading-6 text-slate-200">
                {entry.value}
              </p>
            </div>
          ))}
        </div>
      </section>
    </aside>
  );
}

function DeliveryBadge({ submission }: { submission: Submission }) {
  if (submission.email_error) {
    return (
      <span className="inline-flex w-fit items-center gap-2 rounded-full border border-amber-300/30 bg-amber-300/10 px-3 py-2 text-[10px] font-black uppercase tracking-[0.13em] text-amber-100">
        <AlertCircle aria-hidden="true" className="h-4 w-4" />
        Email issue
      </span>
    );
  }

  if (submission.emailed_at) {
    return (
      <span className="inline-flex w-fit items-center gap-2 rounded-full border border-emerald-300/30 bg-emerald-300/10 px-3 py-2 text-[10px] font-black uppercase tracking-[0.13em] text-emerald-100">
        <CheckCircle2 aria-hidden="true" className="h-4 w-4" />
        Emailed
      </span>
    );
  }

  return (
    <span className="inline-flex w-fit items-center gap-2 rounded-full border border-sky-300/30 bg-sky-300/10 px-3 py-2 text-[10px] font-black uppercase tracking-[0.13em] text-sky-100">
      <ClipboardList aria-hidden="true" className="h-4 w-4" />
      Stored
    </span>
  );
}
